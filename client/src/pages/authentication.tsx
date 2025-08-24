import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Authentication() {
  const [cookie, setCookie] = useState("");
  const [cookiePath, setCookiePath] = useState("./cookies/facebook.json");
  const [autoSave, setAutoSave] = useState(true);
  const { toast } = useToast();

  const testAuthMutation = useMutation({
    mutationFn: async (cookieData: string) => {
      const response = await apiRequest("POST", "/api/auth/test", { cookie: cookieData });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Authentication Successful",
        description: "Facebook cookie is valid and working.",
      });
    },
    onError: () => {
      toast({
        title: "Authentication Failed",
        description: "Invalid or expired Facebook cookie.",
        variant: "destructive",
      });
    },
  });

  const handleTestAuth = () => {
    if (!cookie.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid cookie/appstate.",
        variant: "destructive",
      });
      return;
    }

    try {
      JSON.parse(cookie);
      testAuthMutation.mutate(cookie);
    } catch {
      toast({
        title: "Invalid Format",
        description: "Cookie must be in valid JSON format.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl">
        <Card className="bg-surface shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Facebook Authentication</h3>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="cookie-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Cookie/AppState
                </Label>
                <Textarea
                  id="cookie-input"
                  value={cookie}
                  onChange={(e) => setCookie(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none h-32"
                  placeholder="Paste your Facebook cookie/appstate here..."
                  data-testid="textarea-cookie"
                />
                <p className="text-xs text-gray-500 mt-2">JSON format required for appstate authentication</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-Save Cookies
                  </Label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      className="rounded"
                      data-testid="checkbox-autosave"
                    />
                    <span className="text-sm text-gray-600">Automatically save updated cookies</span>
                  </label>
                </div>
                <div>
                  <Label htmlFor="cookie-path" className="block text-sm font-medium text-gray-700 mb-2">
                    Cookie File Path
                  </Label>
                  <Input
                    id="cookie-path"
                    type="text"
                    value={cookiePath}
                    onChange={(e) => setCookiePath(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    data-testid="input-cookie-path"
                  />
                </div>
                <Button
                  onClick={handleTestAuth}
                  disabled={testAuthMutation.isPending}
                  className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                  data-testid="button-test-auth"
                >
                  {testAuthMutation.isPending ? "Testing..." : "Test Authentication"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Login History</h3>
          </div>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Timestamp</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">IP Address</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-3 px-4 text-sm text-gray-900" data-testid="text-login-time">
                      No login history available
                    </td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
