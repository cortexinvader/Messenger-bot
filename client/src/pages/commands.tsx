import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Command } from "@shared/schema";

export default function Commands() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [commandName, setCommandName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: commands, isLoading } = useQuery<Command[]>({
    queryKey: ["/api/commands"],
  });

  const installCommandMutation = useMutation({
    mutationFn: async ({ sourceUrl, commandName }: { sourceUrl: string; commandName?: string }) => {
      const response = await apiRequest("POST", "/api/commands/install", { sourceUrl, commandName });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      setSourceUrl("");
      setCommandName("");
      toast({
        title: "Command Installed",
        description: "Command has been successfully installed.",
      });
    },
    onError: () => {
      toast({
        title: "Installation Failed",
        description: "Failed to install command from URL.",
        variant: "destructive",
      });
    },
  });

  const deleteCommandMutation = useMutation({
    mutationFn: async (commandId: string) => {
      const response = await apiRequest("DELETE", `/api/commands/${commandId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      toast({
        title: "Command Deleted",
        description: "Command has been successfully removed.",
      });
    },
    onError: () => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete command.",
        variant: "destructive",
      });
    },
  });

  const handleInstallCommand = () => {
    if (!sourceUrl.trim()) {
      toast({
        title: "Error",
        description: "Please provide a source URL.",
        variant: "destructive",
      });
      return;
    }

    installCommandMutation.mutate({ sourceUrl, commandName });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="bg-surface rounded-xl h-32 border border-gray-200"></div>
          <div className="bg-surface rounded-xl h-64 border border-gray-200"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Command Management</h2>
        <div className="flex space-x-3">
          <Button
            onClick={handleInstallCommand}
            disabled={installCommandMutation.isPending}
            className="bg-secondary text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
            data-testid="button-install-command"
          >
            <i className="fas fa-plus mr-2"></i>
            {installCommandMutation.isPending ? "Installing..." : "Install Command"}
          </Button>
          <Button
            variant="outline"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            data-testid="button-refresh-commands"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Refresh
          </Button>
        </div>
      </div>

      {/* Install Command Form */}
      <Card className="bg-surface shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Install New Command</h3>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="source-url" className="block text-sm font-medium text-gray-700 mb-2">
                Source URL
              </Label>
              <Input
                id="source-url"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="GitHub raw URL or Pastebin link"
                data-testid="input-source-url"
              />
            </div>
            <div>
              <Label htmlFor="command-name" className="block text-sm font-medium text-gray-700 mb-2">
                Command Name (Optional)
              </Label>
              <Input
                id="command-name"
                type="text"
                value={commandName}
                onChange={(e) => setCommandName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Auto-detected from file"
                data-testid="input-command-name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commands Table */}
      <Card className="bg-surface shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Installed Commands</h3>
        </div>
        <CardContent className="p-0">
          {!commands || commands.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No commands installed. Use the form above to install your first command.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Command</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Description</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Permission</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {commands.map((command) => (
                    <tr key={command.id}>
                      <td className="py-4 px-6">
                        <code
                          className="bg-gray-100 px-2 py-1 rounded text-sm font-mono"
                          data-testid={`text-command-name-${command.id}`}
                        >
                          /{command.name}
                        </code>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600" data-testid={`text-command-desc-${command.id}`}>
                        {command.description || "No description"}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            command.permission === "owner"
                              ? "bg-purple-100 text-purple-600"
                              : command.permission === "admin"
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-primary"
                          }`}
                          data-testid={`status-permission-${command.id}`}
                        >
                          {command.permission}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            command.status === "active"
                              ? "bg-green-100 text-secondary"
                              : "bg-yellow-100 text-accent"
                          }`}
                          data-testid={`status-command-${command.id}`}
                        >
                          {command.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <button
                            className="text-primary hover:text-primary-dark"
                            data-testid={`button-edit-${command.id}`}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => deleteCommandMutation.mutate(command.id)}
                            disabled={deleteCommandMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${command.id}`}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
