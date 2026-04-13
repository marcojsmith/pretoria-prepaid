import { SignIn, SignUp } from "@clerk/clerk-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { SEO } from "@/components/SEO";

const DEFAULT_REDIRECT = "/dashboard";

const Auth = () => {
  const searchParams = new URLSearchParams(window.location.search);
  let redirectUrl = searchParams.get("redirect") ?? DEFAULT_REDIRECT;

  try {
    const url = new URL(redirectUrl, window.location.origin);
    if (
      url.pathname.startsWith("//") ||
      redirectUrl.startsWith("//") ||
      redirectUrl.includes(":")
    ) {
      redirectUrl = DEFAULT_REDIRECT;
    } else {
      redirectUrl = url.pathname;
    }
  } catch {
    if (!redirectUrl.startsWith("/") || redirectUrl.startsWith("//")) {
      redirectUrl = DEFAULT_REDIRECT;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SEO
        title="Authentication"
        description="Sign in or sign up to Pretoria Prepaid to track and manage your electricity usage."
      />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-lg bg-primary/10 p-3">
              <Zap className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Pretoria Prepaid</CardTitle>
          <CardDescription>Manage your prepaid electricity purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4 flex justify-center">
              <SignIn routing="path" path="/auth" forceRedirectUrl={redirectUrl} />
            </TabsContent>

            <TabsContent value="signup" className="mt-4 flex justify-center">
              <SignUp routing="path" path="/auth" forceRedirectUrl={redirectUrl} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
