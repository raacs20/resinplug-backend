export default function Home() {
  return (
    <div style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>ResinPlug API</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>Backend API server for ResinPlug e-commerce.</p>
      <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Endpoints</h2>
      <ul style={{ lineHeight: 2 }}>
        <li><code>GET /api/health</code> — Health check</li>
        <li><code>GET /api/products</code> — List products</li>
        <li><code>GET /api/products/:slug</code> — Single product</li>
        <li><code>GET /api/collections/:name</code> — Product collection</li>
        <li><code>GET /api/categories</code> — Category list</li>
        <li><code>GET /api/search?q=query</code> — Search products</li>
      </ul>
    </div>
  );
}
