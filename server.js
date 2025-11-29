// Railway용 서버 시작 스크립트
// PORT 환경 변수를 명시적으로 처리

const { createServer } = require('http');
const next = require('next');

// 프로덕션 모드 강제 설정
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

console.log('='.repeat(50));
console.log('Starting Next.js server...');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${port}`);
console.log(`Hostname: ${hostname}`);
console.log(`Dev mode: ${dev}`);
console.log('='.repeat(50));

// 프로세스 에러 핸들러 추가
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const app = next({ 
  dev,
  hostname,
  port,
  dir: __dirname,
});

const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    console.log('✅ Next.js app prepared successfully');
    
    const server = createServer(async (req, res) => {
      try {
        // WHATWG URL API 사용 (url.parse() 대신)
        const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        await handle(req, res, {
          pathname: parsedUrl.pathname,
          query: Object.fromEntries(parsedUrl.searchParams),
        });
      } catch (err) {
        console.error('❌ Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });

    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    });

    server.listen(port, hostname, () => {
      console.log('='.repeat(50));
      console.log(`✅ Server is ready on http://${hostname}:${port}`);
      console.log(`✅ Listening on port ${port}`);
      console.log('='.repeat(50));
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  })
  .catch((err) => {
    console.error('❌ Failed to prepare Next.js app:', err);
    console.error(err.stack);
    process.exit(1);
  });

