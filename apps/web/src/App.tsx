export function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 640 }}>
      <h1>Meminspect</h1>
      <p>Lint your agent&apos;s context.</p>
      <p>
        UI shell is running. Full project browser ships in{" "}
        <strong>M1</strong> (Cursor adapter + memory explorer).
      </p>
      <p>
        API: <code>http://127.0.0.1:3847/health</code>
      </p>
    </main>
  );
}
