/**
 * Sessions are now opaque session ids issued by the aiograpi-rest service
 * (the `X-Session-ID` header). The server no longer keeps an
 * `instagram-private-api` client in memory, so serializing/deserializing a
 * session is just passing the id around.
 */
export class SessionManager {
  public static serializeSession = async (sessionId: string): Promise<string> =>
    sessionId

  public static deserializeSession = async (
    serializedSession: string,
  ): Promise<string> => serializedSession
}
