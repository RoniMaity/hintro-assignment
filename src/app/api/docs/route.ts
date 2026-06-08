import { NextResponse } from 'next/server';
import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hintro Meeting Intelligence API',
      version: '1.0.0',
      description: 'API documentation for the Hintro Backend/Fullstack Assignment',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      responses: {
        UnifiedError: {
          description: 'Standard unified error response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  traceId: { type: 'string' },
                  success: { type: 'boolean', example: false },
                  data: { type: 'null' },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string' },
                      message: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
  },
  apis: ['./src/app/api/**/*.ts'], 
};

export async function GET() {
  try {
    const swaggerSpec = swaggerJSDoc(options);
    return NextResponse.json(swaggerSpec);
  } catch (error) {
    console.error('Swagger generation error:', error);
    return NextResponse.json({ error: 'Failed to generate OpenAPI spec' }, { status: 500 });
  }
}
