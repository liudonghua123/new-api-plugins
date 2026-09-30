// ConvAI Innovations Laya System One API
// Proxy requests to backend POST /v1/systemone
const MAX_INPUT_TOKENS = 65536;

export const meta = {
  apiVersion: 1,
  key: "convaiinnovations",
  name: "ConvAI Innovations",
  sortPriority: 90,
  version: "1.0.0",
  icon: "text:CAI",
  author: { name: "ConvAI Innovations", url: "https://convaiinnovations.com" },
  website: "https://convaiinnovations.com/laya",
  description: {
    en: "Structured decisions with Laya, input priced per million tokens and output free",
    zh: "Laya 结构化判断，输入按每百万 token 定价，输出免费",
  },
  baseUrl: "https://api.convaiinnovations.com",
  auth: "api_key",
  models: ["convaiinnovations/laya"],
  upstreams: ["vendor", "new_api"],
  fetchMode: "per_task",
  routes: [
    {
      method: "POST",
      path: "/v1/systemone",
      type: "submit",
      decode: "decodeSystemOne",
      render: "renderSystemOne",
      retainResult: false,
    },
  ],
  usageSchema: {
    input_tokens: {
      type: "number",
      unit: "token",
      description: { en: "Input token unit price", zh: "输入 token 单价" },
    },
  },
  usageExamples: [{ label: "Laya", facts: { input_tokens: 1000 } }],
};

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isEntry(value) {
  return value === null || typeof value === "string" || typeof value === "object";
}

function validateRequest(body) {
  if (!isObject(body)) throw new Error("Request body must be a JSON object");
  if (typeof body.model !== "string" || !body.model.trim()) throw new Error("model is required");
  if (!isEntry(body.state)) throw new Error("state must be text, an object, an array, or null");
  if (!isObject(body.questions) || Object.keys(body.questions).length === 0) throw new Error("questions must be a nonempty object");
  if (body.stream !== undefined && body.stream !== false) throw new Error("Laya System One does not support streaming");

  for (const id of Object.keys(body.questions)) {
    const question = body.questions[id];
    if (!isObject(question) || !["choice", "score", "noul"].includes(question.type)) throw new Error("Each question must have type choice, score, or noul");
    if (question.instructions !== undefined && !isEntry(question.instructions))
      throw new Error("Question instructions must be text, an object, an array, or null");

    const criteria = question.criteria;
    if (question.type === "choice") {
      if (!isObject(criteria) || Object.keys(criteria).length === 0 || Object.keys(criteria).length > 255)
        throw new Error("Choice criteria must contain between 1 and 255 options");
    } else if (question.type === "score") {
      if (!Array.isArray(criteria) || criteria.length < 2 || criteria.length > 10) throw new Error("Score criteria must contain between 2 and 10 levels");
    } else if (criteria != null) {
      if (
        !isObject(criteria) ||
        Object.keys(criteria).some(function (key) {
          return key !== "true" && key !== "false";
        })
      )
        throw new Error("Noul criteria may only describe true and false");
    }
    if (
      criteria != null &&
      Object.values(criteria).some(function (value) {
        return !isEntry(value);
      })
    )
      throw new Error("Criterion descriptions must be text, objects, arrays, or null");
  }
  return body;
}

function systemOneRequest(ctx) {
  const body = validateRequest(ctx.requestBody);
  return { model: ctx.model || body.model, state: body.state, questions: body.questions };
}

export function buildSubmitRequest(ctx) {
  const body = systemOneRequest(ctx);
  let baseUrl = ctx.baseUrl.replace(/\/+$/, "");
  if (baseUrl.endsWith("/v1")) baseUrl = baseUrl.slice(0, -3);
  const prefix = ctx.upstream && ctx.upstream.kind === "new_api" ? "/convaiinnovations" : "";
  return {
    url: baseUrl + prefix + "/v1/systemone",
    method: "POST",
    headers: {
      Authorization: "Bearer " + ctx.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body,
  };
}

export function parseSubmitResponse(ctx, response) {
  if (response.statusCode < 200 || response.statusCode >= 300) throw new Error("Laya returned HTTP " + response.statusCode);
  const body = response.body;
  if (!isObject(body) || typeof body.model !== "string" || !body.model || !isObject(body.answers))
    throw new Error("Laya response is missing model or answers");
  for (const id of Object.keys(ctx.requestBody.questions)) {
    const answer = Object.prototype.hasOwnProperty.call(body.answers, id) ? body.answers[id] : null;
    if (!isObject(answer) || answer.type !== ctx.requestBody.questions[id].type)
      throw new Error("Laya response is missing a matching answer for a question");
  }
  if (!ctx.publicTaskId) throw new Error("Missing gateway request ID");
  return {
    taskId: ctx.publicTaskId,
    taskData: body,
    immediate: { status: "SUCCESS", progress: "100%" },
  };
}

export function extractUsage(ctx) {
  systemOneRequest(ctx);
  if (ctx.usagePurpose === "billing_ratios") return null;
  return { input_tokens: MAX_INPUT_TOKENS };
}

export function extractUsageOnComplete(ctx, result, body) {
  const tokens = body && body.usage && body.usage.input_tokens;
  if (!Number.isInteger(tokens) || tokens < 0 || tokens > MAX_INPUT_TOKENS)
    throw new Error("Laya input token usage is missing or outside the supported context budget");
  return { input_tokens: tokens };
}

export function buildQueryRequest() {
  throw new Error("Laya System One has no task retrieval endpoint");
}

export function parseTaskResult() {
  return { status: "UNKNOWN", reason: "Laya System One has no asynchronous tasks" };
}

export const native = {
  decodeSystemOne: function (ctx) {
    if (!ctx.body || ctx.body.kind !== "json") throw new Error("JSON body required");
    const body = validateRequest(ctx.body.value);
    return {
      kind: "submit",
      model: body.model,
      action: "systemone",
      requestBody: { model: body.model, state: body.state, questions: body.questions },
    };
  },
  renderSystemOne: function (ctx, task) {
    return task.data;
  },
  error: function (ctx, error) {
    return { detail: error.message };
  },
};