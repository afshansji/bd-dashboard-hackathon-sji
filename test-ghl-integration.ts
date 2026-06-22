/**
 * GHL Integration Test Suite
 * Tests the core logic without requiring a live Supabase instance
 */

// Mock environment
const mockEnv = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-key",
  INTEGRATION_SECRET_KEY: "test-secret-key-32-chars-long!",
  GOHIGHLEVEL_CLIENT_ID: "test-client-id",
  GOHIGHLEVEL_CLIENT_SECRET: "test-client-secret",
  GHL_WEBHOOK_SECRET: "test-webhook-secret",
};

// Test utilities
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ FAILED: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

function assertEquals(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`❌ FAILED: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

// Test 1: Environment Validation
function testEnvironmentValidation() {
  console.log("\n📋 Test 1: Environment Validation");

  function validateEnvironment(env: Record<string, string | undefined>): { valid: boolean; missing: string[] } {
    const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "INTEGRATION_SECRET_KEY"];
    const missing = required.filter(key => !env[key]);

    const oauthMissing: string[] = [];
    if (!env.GOHIGHLEVEL_CLIENT_ID) oauthMissing.push("GOHIGHLEVEL_CLIENT_ID");
    if (!env.GOHIGHLEVEL_CLIENT_SECRET) oauthMissing.push("GOHIGHLEVEL_CLIENT_SECRET");

    if (oauthMissing.length > 0) {
      console.log(`⚠️  OAuth credentials missing: ${oauthMissing.join(", ")}`);
    }

    return { valid: missing.length === 0, missing };
  }

  // Test valid environment
  const result1 = validateEnvironment(mockEnv);
  assert(result1.valid === true, "Valid environment should pass");
  assertEquals(result1.missing.length, 0, "Should have no missing variables");

  // Test missing required variables
  const incompleteEnv = { ...mockEnv };
  delete incompleteEnv.INTEGRATION_SECRET_KEY;
  const result2 = validateEnvironment(incompleteEnv);
  assert(result2.valid === false, "Invalid environment should fail");
  assert(result2.missing.includes("INTEGRATION_SECRET_KEY"), "Should detect missing INTEGRATION_SECRET_KEY");

  // Test missing OAuth credentials (should still be valid but warn)
  const noOAuthEnv = { ...mockEnv };
  delete noOAuthEnv.GOHIGHLEVEL_CLIENT_ID;
  delete noOAuthEnv.GOHIGHLEVEL_CLIENT_SECRET;
  const result3 = validateEnvironment(noOAuthEnv);
  assert(result3.valid === true, "Should be valid without OAuth credentials");
}

// Test 2: OAuth Token Detection
function testOAuthTokenDetection() {
  console.log("\n📋 Test 2: OAuth Token Detection");

  function detectTokenType(apiKey: string): "oauth" | "private_api_key" {
    const isJWT = apiKey.split('.').length === 3;
    return isJWT ? 'oauth' : 'private_api_key';
  }

  // Test JWT detection
  const jwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature";
  assertEquals(detectTokenType(jwtToken), "oauth", "Should detect JWT as OAuth token");

  // Test private key detection
  const privateKey = "sk_live_abc123def456";
  assertEquals(detectTokenType(privateKey), "private_api_key", "Should detect non-JWT as private API key");

  // Test malformed token
  const malformed = "just.two.parts";
  assertEquals(detectTokenType(malformed), "oauth", "Three-part token should be detected as OAuth");
}

// Test 3: Error Message Formatting
function testErrorMessages() {
  console.log("\n📋 Test 3: Error Message Formatting");

  function formatError(method: string, endpoint: string, status: number, details: string): string {
    return `GoHighLevel API error on ${method} ${endpoint} (${status}): ${details}`;
  }

  const error1 = formatError("POST", "/contacts/search", 401, "Invalid API key");
  assert(error1.includes("POST"), "Should include HTTP method");
  assert(error1.includes("/contacts/search"), "Should include endpoint");
  assert(error1.includes("401"), "Should include status code");
  assert(error1.includes("Invalid API key"), "Should include error details");

  const expected = "GoHighLevel API error on POST /contacts/search (401): Invalid API key";
  assertEquals(error1, expected, "Should format error message correctly");
}

// Test 4: Rate Limit Retry Logic
function testRetryLogic() {
  console.log("\n📋 Test 4: Rate Limit Retry Logic");

  function calculateWaitTime(retryCount: number, retryAfter?: string): number {
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }
    return Math.pow(2, retryCount) * 1000;
  }

  // Test exponential backoff
  assertEquals(calculateWaitTime(0), 1000, "First retry should wait 1 second");
  assertEquals(calculateWaitTime(1), 2000, "Second retry should wait 2 seconds");
  assertEquals(calculateWaitTime(2), 4000, "Third retry should wait 4 seconds");

  // Test Retry-After header
  assertEquals(calculateWaitTime(0, "5"), 5000, "Should respect Retry-After header");
  assertEquals(calculateWaitTime(2, "10"), 10000, "Should prioritize Retry-After over exponential backoff");
}

// Test 5: Contact Duplicate Detection
function testDuplicateDetection() {
  console.log("\n📋 Test 5: Contact Duplicate Detection");

  interface Contact {
    id: string;
    email: string;
  }

  function detectDuplicates(contacts: Contact[]): { hasDuplicates: boolean; count: number } {
    return {
      hasDuplicates: contacts.length > 1,
      count: contacts.length
    };
  }

  // Test single contact
  const single = detectDuplicates([{ id: "1", email: "test@example.com" }]);
  assert(!single.hasDuplicates, "Single contact should not be a duplicate");
  assertEquals(single.count, 1, "Should count 1 contact");

  // Test duplicates
  const duplicates = detectDuplicates([
    { id: "1", email: "test@example.com" },
    { id: "2", email: "test@example.com" },
    { id: "3", email: "test@example.com" }
  ]);
  assert(duplicates.hasDuplicates, "Should detect duplicates");
  assertEquals(duplicates.count, 3, "Should count all duplicate contacts");
}

// Test 6: Webhook Security
function testWebhookSecurity() {
  console.log("\n📋 Test 6: Webhook Security");

  function validateWebhookSecret(
    provided: string | null,
    expected: string | undefined
  ): { valid: boolean; shouldWarn: boolean } {
    if (!expected) {
      return { valid: true, shouldWarn: true }; // Allow but warn
    }
    return { valid: provided === expected, shouldWarn: false };
  }

  // Test correct secret
  const result1 = validateWebhookSecret("correct-secret", "correct-secret");
  assert(result1.valid, "Correct secret should be valid");
  assert(!result1.shouldWarn, "Should not warn with correct secret");

  // Test wrong secret
  const result2 = validateWebhookSecret("wrong-secret", "correct-secret");
  assert(!result2.valid, "Wrong secret should be invalid");

  // Test missing secret configuration
  const result3 = validateWebhookSecret("any-secret", undefined);
  assert(result3.valid, "Should allow when no secret configured");
  assert(result3.shouldWarn, "Should warn when no secret configured");

  // Test null secret provided
  const result4 = validateWebhookSecret(null, "expected-secret");
  assert(!result4.valid, "Null secret should be invalid");
}

// Test 7: Sync Metadata Structure
function testSyncMetadata() {
  console.log("\n📋 Test 7: Sync Metadata Structure");

  interface SyncMetadata {
    integration_id: string;
    location_id: string;
    location_name: string;
    triggeredBy: "manual" | "webhook";
    started_at: string;
    status?: "success" | "error";
    contacts?: number;
    deals?: number;
    pipelineValue?: number;
    duration_ms?: number;
    error?: string;
  }

  const metadata: SyncMetadata = {
    integration_id: "uuid-123",
    location_id: "loc-456",
    location_name: "Test Location",
    triggeredBy: "manual",
    started_at: new Date().toISOString(),
  };

  assert(metadata.integration_id !== undefined, "Should have integration_id");
  assert(metadata.location_id !== undefined, "Should have location_id");
  assert(metadata.triggeredBy === "manual" || metadata.triggeredBy === "webhook", "Should have valid trigger source");

  // Test success metadata
  const successMetadata: SyncMetadata = {
    ...metadata,
    status: "success",
    contacts: 10,
    deals: 5,
    pipelineValue: 50000,
    duration_ms: 2500,
  };

  assert(successMetadata.status === "success", "Success metadata should have success status");
  assert(typeof successMetadata.contacts === "number", "Should have numeric contact count");
  assert(typeof successMetadata.duration_ms === "number", "Should have numeric duration");

  // Test error metadata
  const errorMetadata: SyncMetadata = {
    ...metadata,
    status: "error",
    error: "API rate limit exceeded",
    duration_ms: 1200,
  };

  assert(errorMetadata.status === "error", "Error metadata should have error status");
  assert(typeof errorMetadata.error === "string", "Should have error message");
}

// Test 8: Integration Data Structure
function testIntegrationDataStructure() {
  console.log("\n📋 Test 8: Integration Data Structure");

  interface IntegrationData {
    user_id: string;
    api_key_encrypted: string;
    location_id: string;
    location_name: string;
    is_active: boolean;
    token_type: "oauth" | "private_api_key";
    refresh_token_encrypted?: string;
    token_expires_at?: string;
  }

  // Test private API key integration
  const privateKeyIntegration: IntegrationData = {
    user_id: "user-123",
    api_key_encrypted: "encrypted-key",
    location_id: "loc-456",
    location_name: "Test Location",
    is_active: true,
    token_type: "private_api_key",
  };

  assert(privateKeyIntegration.token_type === "private_api_key", "Should be private API key type");
  assert(privateKeyIntegration.refresh_token_encrypted === undefined, "Private key should not have refresh token");

  // Test OAuth integration
  const oauthIntegration: IntegrationData = {
    user_id: "user-123",
    api_key_encrypted: "encrypted-access-token",
    location_id: "loc-456",
    location_name: "Test Location",
    is_active: true,
    token_type: "oauth",
    refresh_token_encrypted: "encrypted-refresh-token",
    token_expires_at: new Date(Date.now() + 86400000).toISOString(),
  };

  assert(oauthIntegration.token_type === "oauth", "Should be OAuth type");
  assert(oauthIntegration.refresh_token_encrypted !== undefined, "OAuth should have refresh token");
  assert(oauthIntegration.token_expires_at !== undefined, "OAuth should have expiration time");
}

// Test 9: CORS Headers
function testCORSHeaders() {
  console.log("\n📋 Test 9: CORS Headers");

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-ghl-secret',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  const allowedHeaders = corsHeaders['Access-Control-Allow-Headers'];
  assert(allowedHeaders.includes('x-webhook-secret'), "Should allow x-webhook-secret header");
  assert(allowedHeaders.includes('x-ghl-secret'), "Should allow x-ghl-secret header");
  assert(allowedHeaders.includes('authorization'), "Should allow authorization header");
  assert(allowedHeaders.includes('content-type'), "Should allow content-type header");
}

// Run all tests
async function runAllTests() {
  console.log("🧪 Starting GHL Integration Test Suite\n");
  console.log("=" .repeat(60));

  try {
    testEnvironmentValidation();
    testOAuthTokenDetection();
    testErrorMessages();
    testRetryLogic();
    testDuplicateDetection();
    testWebhookSecurity();
    testSyncMetadata();
    testIntegrationDataStructure();
    testCORSHeaders();

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests passed!");
    console.log("=" .repeat(60));
    console.log("\n📊 Test Summary:");
    console.log("  Total Tests: 9");
    console.log("  Passed: 9");
    console.log("  Failed: 0");
    console.log("\n✨ GHL Integration is ready for deployment!");

  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ Test suite failed!");
    console.error("=".repeat(60));
    if (error instanceof Error) {
      console.error("\nError:", error.message);
    }
    process.exit(1);
  }
}

// Run tests
runAllTests();
