export const opcodes = {
    "NOP": 0x0,
    "CMP": 0x1,
    "STOP": 0x04,
    "DBG": 0x0f,
    "PUSHL": 0x10,
    "PUSH": 0x10,
    "PUSHH": 0x11,
    "DROP": 0x14,
    "DUP": 0x15,
    "SWAP": 0x18,
    "BRAINROT": 0x19,
    "ROT": 0x19,
    "OVER": 0x1a,
    "ADD": 0x20,
    "SUB": 0x21,
    "MUL": 0x24,
    "DIV": 0x25,
    "INC": 0x28,
    "DEC": 0x29,
    "LOADI": 0x44,
    "STOREI": 0x45,
    "-": 0x0,
};
export const longAddressOpcodes = {
    "LOAD": 0b1000,
    "STORE": 0b1001,
    "JMP": 0b1010,
    "JZ": 0b1011,
    "JNZ": 0b1100,
    "JL": 0b1101,
    "JG": 0b1110,
    "JC": 0b1111,
};
export const opcodeNames = new Set(Object.keys({
    ...opcodes,
    ...longAddressOpcodes
}));
export const literalOpcodes = new Set([
    "LOAD", "STORE", "JZ", "JNZ", "JL", "JG", "JMP", "PUSH", "PUSHL", "PUSHH"
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
        return `${mnemonic} ${literalOpcodes.has(mnemonic) ? operand.toString(16).toUpperCase().padStart(longFlag ? 3 : 2, '0') : ""}`;
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
    const operand = literalOpcodes.has(mnemonic) ? parseOperand(parts[1]) : 0;
    // @ts-ignore
    if (longAddressOpcodes[mnemonic] !== undefined) {
        return (1 << 15) | (opcode << 12) | (operand & 0xFFF);
    }
    else {
        return (opcode << 8) | (operand & 0xFF);
    }
}
export function parseOperand(operand) {
    if (labels[operand] !== undefined) {
        return labels[operand];
    }
    else {
        return parseInt(operand, 16);
    }
}
let labels = {};
export function getLabels(code) {
    return code.split("\n")
        .map(line => line.split(";")[0].trim())
        .filter(line => line.endsWith(":"))
        .map(instruction => instruction.slice(0, -1).trim());
}
export function splitInstructions(code) {
    const parts = code.trim().split(" ");
    if (parts[0].toUpperCase() == "PUSH") {
        return parts.slice(1)
            .map(data => data.trim())
            .filter(data => data.length > 0)
            .map(data => {
            let value = parseInt(data, 16);
            if (value > 0xFF) {
                return [
                    `PUSH ${data.slice(-2)}`,
                    `PUSHH ${data.length > 2 ? data.slice(-4, -2) : "00"}`,
                ];
            }
            else {
                return `PUSH ${data}`;
            }
        }).flat();
    }
    else {
        return code;
    }
}
export function assemble(code) {
    labels = {};
    return code.split("\n")
        .map(line => line.split(";")[0].trim())
        .filter(line => line.length > 0)
        .map(splitInstructions)
        .flat()
        .map((instruction, index) => {
        if (instruction.endsWith(":")) {
            labels[instruction.slice(0, -1).trim()] = index - Object.keys(labels).length;
            return null;
        }
        else {
            return instruction;
        }
    })
        .filter(v => v !== null)
        .map(assembleString);
}
