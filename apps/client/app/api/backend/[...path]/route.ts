import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';

const BACKEND_URL = process.env.BACKEND_URL || 'https://seedier-reese-nomographic.ngrok-free.dev';

const isNgrok = BACKEND_URL.includes('ngrok');

const httpsAgent = isNgrok
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string
): Promise<NextResponse> {
  const pathStr = path.join('/');
  const url = new URL(pathStr, BACKEND_URL);
  url.search = request.nextUrl.searchParams.toString();

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'host' && lower !== 'connection' && lower !== 'content-length') {
      headers[key] = value;
    }
  });
  if (isNgrok) {
    headers['ngrok-skip-browser-warning'] = 'true';
    headers['User-Agent'] = 'SettleKit-Proxy/1.0';
  }

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      // No body
    }
  }

  const targetUrl = url.toString();

  try {
    const response = await axios({
      method,
      url: targetUrl,
      headers,
      data: body,
      timeout: 15000,
      httpsAgent: url.protocol === 'https:' ? httpsAgent : undefined,
      validateStatus: () => true,
    });

    const data = response.data;
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers['content-type'] || 'application/json',
      },
    });
  } catch (error) {
    const err = error as Error & { cause?: Error; code?: string };
    console.error('[backend proxy] Request failed:', {
      url: targetUrl,
      error: err.message,
      code: err.code,
      cause: err.cause?.message,
    });
    return NextResponse.json(
      {
        error: 'Backend unavailable',
        details: err.message,
        hint: isNgrok
          ? 'Ensure ngrok tunnel is running and reachable'
          : 'Ensure skit-backend is running on ' + BACKEND_URL,
      },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}
