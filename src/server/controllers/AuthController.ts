import { Request, Response } from "express"
import { SessionManager } from "../utils/SessionManager"
import { callInstagrapi } from "../utils/InstagrapiClient"
import {
  LoginResponse,
  TwoFactorLoginResponse,
  TwoFactorLoginType,
} from "../../../types/types"
import { LoginRequest } from "../../client/hooks/useAuth"

export class AuthController {
  public static login = async (
    req: Request<{}, {}, LoginRequest>,
    res: Response,
  ) => {
    try {
      const { username, password, twoFactor } = req.body

      const response = await callInstagrapi<string>("/auth/login", {
        method: "POST",
        form: {
          username,
          password,
          verification_code: twoFactor?.code,
        },
      })

      if (response.status >= 300) {
        const body = response.body as any
        if (response.status === 401 && body?.exc_type === "TwoFactorRequired") {
          // aiograpi-rest does not distinguish TOTP from SMS, so default to
          // TOTP and let the user retry with the verification code.
          const twoFactorLoginResponse: TwoFactorLoginResponse = {
            type: TwoFactorLoginType.TOTP,
            identifier: "",
          }
          const loginResponse: LoginResponse = {
            session: "",
            twoFactor: twoFactorLoginResponse,
          }
          res.send(loginResponse)
          return
        }
        // Surface the real aiograpi-rest error instead of masking it as a
        // generic bad-credentials response.
        res.status(400).send({
          message: body?.detail || body?.message || "Login failed.",
          errorType: body?.exc_type,
        })
        return
      }

      const loginResponse: LoginResponse = {
        session: await SessionManager.serializeSession(String(response.body)),
      }
      res.send(loginResponse)
    } catch (e) {
      res.sendStatus(400)
    }
  }

  public static logout = async (req: Request, res: Response) => {
    try {
      // aiograpi-rest does not expose a logout route; the session id is simply
      // discarded by the client.
      res.send({ message: "OK" })
    } catch (e) {
      res.sendStatus(400)
    }
  }
}
