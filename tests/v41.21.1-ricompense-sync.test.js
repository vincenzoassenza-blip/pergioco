// node tests/v41.21.1-ricompense-sync.test.js
// v41.21.1: ricompense_sync_auto deve inserire assegnata_da come uuid, non text.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrate-v41.21.1.sql'), 'utf8');
assert.ok(/create or replace function public\.ricompense_sync_auto\(\)/.test(sql), 'manca ricompense_sync_auto');
assert.ok(/security definer/.test(sql), 'deve essere SECURITY DEFINER');
assert.ok(/perform public\.require_privacy_ok\(\);/.test(sql), 'deve chiamare require_privacy_ok');
assert.ok(/null::uuid/.test(sql), 'assegnata_da deve essere null::uuid');
assert.ok(!/select distinct[^;]*null,\s*true/i.test(sql), 'non deve restare un NULL senza cast');
assert.ok(/revoke all on function public\.ricompense_sync_auto\(\) from public, anon;/.test(sql), 'revoke anon');
assert.ok(/grant execute on function public\.ricompense_sync_auto\(\) to authenticated;/.test(sql), 'grant authenticated');
console.log('ok v41.21.1 ricompense_sync_auto');
