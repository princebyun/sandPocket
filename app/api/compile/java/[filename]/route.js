import fs from "fs";
import path from "path";
import os from "os";

/**
 * GET /api/compile/java/[filename]
 * Serves the compiled JAR file directly to CheerpJ runtime over HTTP.
 * Supports HTTP Range requests and proper Java Archive headers.
 */
export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    const buildId = filename.replace(/\.jar$/, "");
    
    const jarPath = path.join(os.tmpdir(), `sandpocket-javac-${buildId}`, `${buildId}.jar`);
    
    let buffer;
    try {
      buffer = await fs.promises.readFile(jarPath);
    } catch (err) {
      return new Response("Compiled JAR not found or expired", { status: 404 });
    }

    // Support HTTP range request if CheerpJ asks for partial content
    const rangeHeader = request.headers.get("range");
    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace("bytes=", "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;

      if (start >= buffer.length || end >= buffer.length) {
        return new Response("Range Not Satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${buffer.length}` },
        });
      }

      const chunk = buffer.subarray(start, end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          "Content-Type": "application/java-archive",
          "Content-Range": `bytes ${start}-${end}/${buffer.length}`,
          "Content-Length": chunk.length.toString(),
          "Accept-Ranges": "bytes",
        },
      });
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/java-archive",
        "Content-Length": buffer.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[API] GET JAR error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * HEAD /api/compile/java/[filename]
 * CheerpJ pre-checks JAR file existence, Content-Length, and Accept-Ranges.
 */
export async function HEAD(request, { params }) {
  try {
    const { filename } = await params;
    const buildId = filename.replace(/\.jar$/, "");
    
    const jarPath = path.join(os.tmpdir(), `sandpocket-javac-${buildId}`, `${buildId}.jar`);
    
    let buffer;
    try {
      buffer = await fs.promises.readFile(jarPath);
    } catch (err) {
      return new Response(null, { status: 404 });
    }

    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "application/java-archive",
        "Content-Length": buffer.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[API] HEAD JAR error:", error);
    return new Response(null, { status: 500 });
  }
}

