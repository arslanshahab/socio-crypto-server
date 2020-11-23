import {Firebase} from "../clients/firebase";
import {asyncHandler} from "../util/helpers";
import {Request, Response} from "express";

const isSecure = process.env.NODE_ENV === 'production';

export const sessionLogin = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body;
  let sessionCookie;
  const decodedToken = await Firebase.verifyToken(idToken);
  const expiresIn = 60 * 60 * 24 * 5 * 1000;
  // Only process if the user just signed in in the last 5 minutes.
  if (new Date().getTime() / 1000 - decodedToken.auth_time < 5 * 60) {
    sessionCookie = await Firebase.createSessionCookie(idToken, expiresIn);
  } else {
    res.status(401).send('Recent sign in required!');
  }
  const options = {maxAge: expiresIn, httpOnly: true, secure: isSecure};
  res.cookie('session', sessionCookie, options);
  return res.status(200).json({success: true});
});

export const sessionLogout = asyncHandler(async (req: Request, res: Response) => {
  const sessionCookie = req.cookies.session || '';
  res.clearCookie('session');
  const decodedToken = await Firebase.verifySessionCookie(sessionCookie);
  await Firebase.revokeRefreshToken(decodedToken.sub);
  return res.status(200).json({success: true});
});

export const getUserRole = async (args: any, context: { user: any}) => {
  return context.user.role ? context.user.role : '';
}
