var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-C8yOnN/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// worker.js
var MAX_STEP = { fights: 30, twins: 5, titels: 5 };
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var cors = /* @__PURE__ */ __name((origin) => ({
  "access-control-allow-origin": origin || "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400"
}), "cors");
var json = /* @__PURE__ */ __name((data, status, origin) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors(origin) } }), "json");
function cleanName(s) {
  return String(s || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
}
__name(cleanName, "cleanName");
var int = /* @__PURE__ */ __name((v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0))), "int");
var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url), origin = allowedOrigin(req.headers.get("origin"), env);
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors(origin) });
    if (req.method === "GET" && url.pathname === "/top") {
      const by = url.searchParams.get("by") === "twins" ? "twins" : "fights";
      const limit = int(url.searchParams.get("limit") || 25, 100) || 25, me = url.searchParams.get("me") || "";
      const order = by === "twins" ? "twins DESC, fights DESC" : "fights DESC, twins DESC";
      const { results } = await env.DB.prepare(`SELECT id, naam, fights, twins, graad, titels FROM players WHERE ${by} > 0 ORDER BY ${order}, updated ASC LIMIT ?`).bind(limit).all();
      return json({ by, rows: results.map((r) => ({ naam: r.naam, fights: r.fights, twins: r.twins, graad: r.graad, titels: r.titels, me: r.id === me })) }, 200, origin);
    }
    if (req.method === "POST" && url.pathname === "/submit") {
      let b;
      try {
        b = await req.json();
      } catch {
        return json({ error: "geen json" }, 400, origin);
      }
      if (!UUID.test(b.id || ""))
        return json({ error: "ongeldige id" }, 400, origin);
      const naam = cleanName(b.naam);
      if (!naam)
        return json({ error: "naam ontbreekt" }, 400, origin);
      const now = Date.now();
      const old = await env.DB.prepare("SELECT fights, twins, titels, updated FROM players WHERE id = ?").bind(b.id).first();
      if (old && now - old.updated < 2e3)
        return json({ error: "te snel" }, 429, origin);
      const step = /* @__PURE__ */ __name((k, v) => old ? Math.max(old[k], Math.min(int(v, 1e6), old[k] + MAX_STEP[k])) : Math.min(int(v, 1e6), MAX_STEP[k] * 4), "step");
      const row = { fights: step("fights", b.fights), twins: step("twins", b.twins), titels: step("titels", b.titels) };
      await env.DB.prepare(`INSERT INTO players (id, naam, fights, twins, graad, titels, updated) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET naam = excluded.naam, fights = excluded.fights, twins = excluded.twins, graad = excluded.graad, titels = excluded.titels, updated = excluded.updated`).bind(b.id, naam, row.fights, row.twins, cleanName(b.graad), row.titels, now).run();
      return json({ ok: true, ...row }, 200, origin);
    }
    return json({ error: "niet gevonden" }, 404, origin);
  }
};
function allowedOrigin(o, env) {
  const ok = (env.ALLOWED_ORIGINS || "https://mailbvandongen-eng.github.io,http://127.0.0.1:8766,http://localhost:8766").split(",");
  return o && ok.includes(o) ? o : ok[0];
}
__name(allowedOrigin, "allowedOrigin");

// ../../../../../tmp/wr/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../tmp/wr/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-C8yOnN/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../../../tmp/wr/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-C8yOnN/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
