import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AIConfig() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [temperature, setTemperature] = useState(0.7);
  const [geminiEnabled, setGeminiEnabled] = useState(true);
  const [primaryFallback, setPrimaryFallback] = useState("openai");
  const [secondaryFallback, setSecondaryFallback] = useState("local");
  const [rateThreshold, setRateThreshold] = useState(100);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const { toast } = useToast();

  const handleSaveConfig = () => {
    toast({
      title: "Configuration Saved",
      description: "AI configuration has been updated successfully.",
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gemini Configuration */}
          <Card className="bg-surface shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Gemini AI Configuration</h3>
            </div>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="Enter your Gemini API key"
                  data-testid="input-api-key"
                />
              </div>
              <div>
                <Label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </Label>
                <select
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  data-testid="select-model"
                >
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-pro">gemini-pro</option>
                </select>
              </div>
              <div>
                <Label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature: {temperature}
                </Label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                  data-testid="slider-temperature"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Conservative</span>
                  <span>Creative</span>
                </div>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={geminiEnabled}
                    onChange={(e) => setGeminiEnabled(e.target.checked)}
                    className="rounded"
                    data-testid="checkbox-gemini-enabled"
                  />
                  <span className="text-sm text-gray-600">Enable Gemini AI responses</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Fallback Models */}
          <Card className="bg-surface shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Fallback Models</h3>
            </div>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="primary-fallback" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Fallback
                </Label>
                <select
                  id="primary-fallback"
                  value={primaryFallback}
                  onChange={(e) => setPrimaryFallback(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  data-testid="select-primary-fallback"
                >
                  <option value="openai">OpenAI GPT-3.5</option>
                  <option value="claude">Claude-3</option>
                  <option value="local">Local Model</option>
                </select>
              </div>
              <div>
                <Label htmlFor="secondary-fallback" className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Fallback
                </Label>
                <select
                  id="secondary-fallback"
                  value={secondaryFallback}
                  onChange={(e) => setSecondaryFallback(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  data-testid="select-secondary-fallback"
                >
                  <option value="local">Local Model</option>
                  <option value="openai">OpenAI GPT-3.5</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div>
                <Label htmlFor="rate-threshold" className="block text-sm font-medium text-gray-700 mb-2">
                  Rate Limit Threshold
                </Label>
                <Input
                  id="rate-threshold"
                  type="number"
                  value={rateThreshold}
                  onChange={(e) => setRateThreshold(parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  data-testid="input-rate-threshold"
                />
                <p className="text-xs text-gray-500 mt-1">Requests per hour before fallback</p>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={autoSwitch}
                    onChange={(e) => setAutoSwitch(e.target.checked)}
                    className="rounded"
                    data-testid="checkbox-auto-switch"
                  />
                  <span className="text-sm text-gray-600">Automatically switch on 429 errors</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-6">
          <Button
            onClick={handleSaveConfig}
            className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
            data-testid="button-save-config"
          >
            Save Configuration
          </Button>
        </div>

        {/* AI Usage Statistics */}
        <Card className="bg-surface shadow-sm border border-gray-200 mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-semibold text-primary" data-testid="text-requests-today">
                  247
                </div>
                <div className="text-sm text-gray-600">Requests Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-secondary" data-testid="text-success-rate">
                  98.5%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-accent" data-testid="text-avg-response-time">
                  1.2s
                </div>
                <div className="text-sm text-gray-600">Avg Response Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
