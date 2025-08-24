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
            
            // For demonstration, we'll simulate a weather response
            const weatherData = {
                location: location,
                temperature: Math.floor(Math.random() * 30) + 10,
                condition: ['Sunny', 'Cloudy', 'Rainy', 'Snowy'][Math.floor(Math.random() * 4)],
                humidity: Math.floor(Math.random() * 100),
                windSpeed: Math.floor(Math.random() * 20)
            };
            
            const weatherText = `
🌤️ Weather for ${weatherData.location}

🌡️ Temperature: ${weatherData.temperature}°C
☁️ Condition: ${weatherData.condition}
💧 Humidity: ${weatherData.humidity}%
💨 Wind Speed: ${weatherData.windSpeed} km/h
            `.trim();
            
            api.sendMessage(weatherText, threadID);
            
        } catch (error) {
            console.error('Weather command error:', error.message);
            api.sendMessage('❌ Failed to fetch weather information. Please try again later.', threadID);
        }
    }
};
