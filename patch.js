const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const newContent = content.replace(
  "function requireAdmin(req: any, res: any, next: any) {",
  "function requireMainAdmin(req: any, res: any, next: any) {\n  if (req.user?.role !== 'admin') {\n    return res.status(403).json({ error: 'Forbidden: Main Admin access required' });\n  }\n  next();\n}\n\nfunction requireAdmin(req: any, res: any, next: any) {"
);
fs.writeFileSync('server.ts', newContent);
