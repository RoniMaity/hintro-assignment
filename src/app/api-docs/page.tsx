'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { useEffect, useState } from 'react';

// Dynamically import swagger-ui-react to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    fetch('/api/docs')
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => console.error('Failed to load Swagger spec:', err));
  }, []);

  if (!spec) return <div style={{ padding: '2rem' }}>Loading API documentation...</div>;

  return (
    <div style={{ padding: '2rem', background: '#fff', minHeight: '100vh', color: '#000' }}>
      <SwaggerUI spec={spec} />
    </div>
  );
}
