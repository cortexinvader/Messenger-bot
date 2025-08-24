const axios = require('axios');

module.exports = {
    name: 'weather',
    description: 'Get weather information for a location',
    permission: 'user',
    usage: '/weather [location]',
    examples: [
        '/weather London',
        '/weather New York',
        '/weather Tokyo'
    ],
    
    async execute(api, message, args, bot) {
        const { threadID } = message;
        
        if (args.length === 0) {
            return api.sendMessage('❌ Please specify a location. Usage: /weather [location]', threadID);
        }
        
        const location = args.join(' ');
        
        try {
            // You would use a real weather API here
            const apiKey = process.env.WEATHER_API_KEY || 'your_weather_api_key';
            
            // Weather API integration needed - using placeholder for now
            const weatherData = {
                location: location,
                temperature: '??',
                condition: 'Weather API not configured',
                humidity: '??',
                windSpeed: '??'
            };
            
            const weatherText = `
🌤️ Weather for ${weatherData.location}

❌ Weather API not configured
Please set WEATHER_API_KEY environment variable
to enable real weather data.
            `.trim();
            
            api.sendMessage(weatherText, threadID);
            
        } catch (error) {
            console.error('Weather command error:', error.message);
            api.sendMessage('❌ Failed to fetch weather information. Please try again later.', threadID);
        }
    }
};
