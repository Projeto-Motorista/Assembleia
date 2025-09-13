const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  
  if (req.url === '/api/health') {
    res.end(JSON.stringify({
      status: 'OK',
      message: 'Backend do Sistema de Dízimos está funcionando!',
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/api/dashboard/stats') {
    res.end(JSON.stringify({
      totalContributions: 1250.50,
      totalMembers: 45,
      thisMonth: 450.00,
      lastMonthComparison: 12.5
    }));
  } else {
    res.end(JSON.stringify({
      message: 'API do Sistema de Dízimos - Assembleia de Deus Vila Maria',
      endpoints: [
        '/api/health - Status do servidor',
        '/api/dashboard/stats - Estatísticas do dashboard'
      ]
    }));
  }
});

const PORT = 3456;
server.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
  console.log(`🔗 Acesse: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard/stats`);
  console.log(`❤️ Status: http://localhost:${PORT}/api/health`);
});