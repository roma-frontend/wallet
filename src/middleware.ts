import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/login"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();

  // Signed-in users never need the login page.
  if (isSignInPage(request) && authed) {
    return nextjsMiddlewareRedirect(request, "/");
  }
  // Everything except the login page requires authentication.
  if (!isSignInPage(request) && !authed) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  // Run on all routes except Next internals and static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
