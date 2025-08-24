import axios from 'axios';

export class UptimeService {
    private url: string | undefined;
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;

    constructor() {
        this.url = process.env.RENDER_EXTERNAL_URL;
        if (this.url) {
            console.log(`🌐 Uptime service initialized for: ${this.url}`);
        } else {
            console.log('ℹ️ No RENDER_EXTERNAL_URL found, uptime service disabled');
        }
    }

    start(): void {
        if (!this.url) {
            console.log('⚠️ Cannot start uptime service: No URL configured');
            return;
        }

        if (this.isRunning) {
            console.log('⚠️ Uptime service is already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting uptime service - pinging every 10 seconds');

        this.intervalId = setInterval(async () => {
            try {
                const response = await axios.get(this.url!, {
                    timeout: 8000,
                    headers: {
                        'User-Agent': 'Nexus-FCA-Bot/1.0'
                    }
                });
                console.log(`✅ Uptime ping successful: ${response.status}`);
            } catch (error: any) {
                console.error(`❌ Uptime ping failed: ${error.message}`);
            }
        }, 10000);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('🛑 Uptime service stopped');
        }
    }

    getStatus(): { isRunning: boolean; url?: string } {
        return {
            isRunning: this.isRunning,
            url: this.url
        };
    }

    updateUrl(newUrl?: string): void {
        if (this.isRunning) {
            this.stop();
        }
        
        this.url = newUrl || process.env.RENDER_EXTERNAL_URL;
        
        if (this.url) {
            console.log(`🔄 Uptime URL updated to: ${this.url}`);
            this.start();
        }
    }
}