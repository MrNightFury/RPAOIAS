const opcodes = {
    "NOP": 0x0,
    "CMP": 0x1,
    "DBG": 0x0f,
    "PUSHL": 0x10,
    "PUSH": 0x10,
    "DROP": 0x14,
    "DUP": 0x15,
    "SWAP": 0x18,
    "OVER": 0x19,
    "ADD": 0x20,
    "SUB": 0x21,
    "MUL": 0x24,
    "DIV": 0x25,
    "LOADI": 0x44,
    "STOREI": 0x45,
    "-": 0x0,
};
const longAddressOpcodes = {
    "LOAD": 0b1000,
    "STORE": 0b1001,
    "JZ": 0b1010,
    "JNZ": 0b1011,
    "JL": 0b1100,
    "JG": 0b1101,
    "JMP": 0b1110,
};
const literalOpcodes = new Set([
    "LOAD", "STORE", "JZ", "JNZ", "JL", "JG", "JMP", "PUSH"
]);
// inverse mapping
const inverseOpcodes = {};
for (const [key, value] of Object.entries(opcodes)) {
    inverseOpcodes[value] = key;
}
const inverseLongAddressOpcodes = {};
for (const [key, value] of Object.entries(longAddressOpcodes)) {
    inverseLongAddressOpcodes[value] = key;
}
export function decodeInstruction(value) {
    const longFlag = (value >> 15) & 1;
    console.log("Decoding instruction:", value.toString(16).padStart(4, '0'), "longFlag =", longFlag);
    const opcode = longFlag ? (value >> 12) & 0xF : (value >> 8) & 0xFF;
    const operand = longFlag ? value & 0xFFF : value & 0xFF;
    const mnemonic = (longFlag ? inverseLongAddressOpcodes : inverseOpcodes)[opcode] || "DATA";
    if (mnemonic === "DATA" || mnemonic === "NOP" || mnemonic === "-") {
        return mnemonic;
    }
    else {
        return `${mnemonic} ${operand.toString(16).toUpperCase().padStart(longFlag ? 3 : 2, '0')}`;
    }
}
export function assembleString(instruction) {
    var _a;
    const parts = instruction.trim().split(" ");
    const mnemonic = parts[0].toUpperCase();
    // @ts-ignore
    const opcode = (_a = opcodes[mnemonic]) !== null && _a !== void 0 ? _a : longAddressOpcodes[mnemonic];
    if (opcode === undefined) {
        throw new Error(`Unknown mnemonic: ${mnemonic}`);
    }
    const operand = literalOpcodes.has(mnemonic) ? parseInt(parts[1], 16) : 0;
    // @ts-ignore
    if (longAddressOpcodes[mnemonic] !== undefined) {
        return (1 << 15) | (opcode << 12) | (operand & 0xFFF);
    }
    else {
        return (opcode << 8) | (operand & 0xFF);
    }
}
export function assemble(code) {
    return code.split("\n")
        .map(line => line.split(";")[0].trim())
        .filter(line => line.length > 0)
        .map(assembleString);
}
// @ts-ignore
if (0 && Deno && Deno.args.length > 0) {
    // @ts-ignore
    console.log(assemble(Deno.args[0]).map(v => v.toString(16).toLocaleUpperCase().padStart(4, '0')).join("\n"));
}
