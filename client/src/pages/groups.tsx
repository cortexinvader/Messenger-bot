import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Group } from "@shared/schema";

export default function Groups() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const verifyGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await apiRequest("POST", `/api/groups/${groupId}/verify`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Group Verified",
        description: "Group has been successfully verified.",
      });
    },
    onError: () => {
      toast({
        title: "Verification Failed",
        description: "Failed to verify group.",
        variant: "destructive",
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ groupId, updates }: { groupId: string; updates: Partial<Group> }) => {
      const response = await apiRequest("PUT", `/api/groups/${groupId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Settings Updated",
        description: "Group settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update group settings.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-surface rounded-xl h-64 border border-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleAIToggle = (group: Group, enabled: boolean) => {
    updateGroupMutation.mutate({
      groupId: group.id,
      updates: { aiEnabled: enabled },
    });
  };

  const handleImageAnalysisToggle = (group: Group, enabled: boolean) => {
    updateGroupMutation.mutate({
      groupId: group.id,
      updates: { imageAnalysisEnabled: enabled },
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors" data-testid="button-refresh-groups">
          <i className="fas fa-sync-alt mr-2"></i>
          Refresh Groups
        </Button>
      </div>

      {!groups || groups.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No groups found. Groups will appear here once the bot joins them.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="bg-surface shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-group-name-${group.id}`}>
                    {group.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      group.verified
                        ? "bg-green-100 text-secondary"
                        : "bg-yellow-100 text-accent"
                    }`}
                    data-testid={`status-group-${group.id}`}
                  >
                    {group.verified ? "Verified" : "Pending"}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Members:</span>
                    <span className="font-medium" data-testid={`text-members-${group.id}`}>
                      {group.members}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thread ID:</span>
                    <span className="font-mono text-xs" data-testid={`text-thread-id-${group.id}`}>
                      {group.threadId}
                    </span>
                  </div>
                  {group.verified && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">AI Responses:</span>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={group.aiEnabled || false}
                            onChange={(e) => handleAIToggle(group, e.target.checked)}
                            className="rounded"
                            data-testid={`checkbox-ai-${group.id}`}
                          />
                          <span className="ml-2 text-xs">
                            {group.aiEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </label>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Image Analysis:</span>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={group.imageAnalysisEnabled || false}
                            onChange={(e) => handleImageAnalysisToggle(group, e.target.checked)}
                            className="rounded"
                            data-testid={`checkbox-image-analysis-${group.id}`}
                          />
                          <span className="ml-2 text-xs">
                            {group.imageAnalysisEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  {group.verified ? (
                    <button
                      className="w-full text-sm text-gray-600 hover:text-gray-900 font-medium"
                      data-testid={`button-manage-${group.id}`}
                    >
                      Manage Settings
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        onClick={() => verifyGroupMutation.mutate(group.id)}
                        disabled={verifyGroupMutation.isPending}
                        className="w-full bg-secondary text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                        data-testid={`button-verify-${group.id}`}
                      >
                        {verifyGroupMutation.isPending ? "Verifying..." : "Verify Group"}
                      </Button>
                      <button
                        className="w-full text-sm text-red-600 hover:text-red-700 font-medium"
                        data-testid={`button-reject-${group.id}`}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
