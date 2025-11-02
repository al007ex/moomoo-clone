module.exports = [
    {
        region: "Local Environment",
        servers: [
            {
                key: "local-default",
                name: "Local Lobby",
                host: "",
                port: "",
                gameIndex: 0,
                playerCount: 0
            }
        ]
    },
    {
        region: "Public Servers",
        servers: [
            {
                key: "public-eu-1",
                name: "Public EU #1",
                host: "your-vps-hostname.example.com",
                port: 8080,
                gameIndex: 0,
                playerCount: 0
            }
        ]
    }
];
