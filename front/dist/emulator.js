var _a;
import init, { Processor, MemoryType } from "../../processor_emulator/pkg/processor_emulator.js";
import { assembleString, decodeInstruction } from "./assembler.js";
/// <reference types="jquery" />
const wasm = await init();
const processor = new Processor();
console.log("Processor initialized:", processor);
const MEM_SIZE = 4096;
let selectedMemoryLine = -1;
function addMemoryLine(address, hex, bin, meaning) {
    const memoryDiv = $("#memory");
    if (!memoryDiv)
        return;
    $("<div>", { class: "memory_line" }).append($("<span>", { class: "memory_address", text: address.toString(16).toUpperCase().padStart(3, '0') }), $("<span>", { class: "memory_hex", text: hex }).on("click", function () {
        selectLine(address);
    }), $("<span>", { class: "memory_bin", text: bin }), $("<input>", { class: "memory_meaning", text: meaning }).on("focus", () => {
        selectLine(-1);
    }).on("keydown", (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            const assembledValue = assembleString(e.target.value);
            processor.set_memory_word(address, assembledValue);
            updateMemoryLine(address, assembledValue);
            $(".memory_line").eq(address + 1).find(".memory_meaning").focus();
        }
    })).appendTo(memoryDiv);
}
function createRegister(name, value) {
    return $("<div>", { class: "register", id: "reg_" + name }).append($("<span>", { class: "register_name", text: name }), $("<span>", { class: "register_value", text: value.toString(16).toUpperCase().padStart(4, '0') }));
}
const posibleKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
function selectLine(address) {
    let memoryLines = document.querySelectorAll(".memory_hex");
    while (address >= memoryLines.length) {
        addMemoryLine(address, "0000", "0000 0000 0000 0000", "NOP");
        memoryLines = document.querySelectorAll(".memory_hex");
    }
    memoryLines.forEach(l => l.classList.remove("selected"));
    if (address != -1)
        memoryLines[address].classList.add("selected");
    selectedMemoryLine = address;
}
function updateMemoryLine(address, value) {
    var _a;
    const line = $(".memory_line").eq(address);
    line.find(".memory_hex").text(value.toString(16).toUpperCase().padStart(4, '0'));
    line.find(".memory_bin").text(((_a = value.toString(2).padStart(16, '0').match(/.{1,4}/g)) === null || _a === void 0 ? void 0 : _a.join(' ')) || '');
    line.find(".memory_meaning").val(decodeInstruction(value));
}
document.addEventListener("keydown", (event) => {
    var _a, _b;
    if (selectedMemoryLine === -1)
        return;
    if (event.key === "ArrowUp") {
        if (selectedMemoryLine > 0) {
            selectLine(selectedMemoryLine - 1);
        }
    }
    else if (event.key === "ArrowDown") {
        selectLine(selectedMemoryLine + 1);
    }
    else if (event.key === "Enter") {
        console.log("Selected memory line:", selectedMemoryLine);
    }
    else if (posibleKeys.includes(event.key.toUpperCase())) {
        const memoryLines = document.querySelectorAll(".memory_hex");
        const selectedLine = memoryLines[selectedMemoryLine];
        if (((_b = (_a = selectedLine.textContent) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) >= 4) {
            selectedLine.textContent = "";
        }
        let currentHex = selectedLine.textContent || "";
        currentHex += event.key.toUpperCase();
        selectedLine.textContent = currentHex;
        if (currentHex.length >= 4) {
            processor.set_memory_word(selectedMemoryLine, parseInt(currentHex, 16));
            updateMemoryLine(selectedMemoryLine, parseInt(currentHex, 16));
            selectLine(selectedMemoryLine + 1);
            console.log("Memory updated at address", selectedMemoryLine, "to", parseInt(currentHex, 16).toString(2));
        }
    }
});
document.addEventListener("paste", (event) => {
    var _a;
    let pasteData = ((_a = event.clipboardData) === null || _a === void 0 ? void 0 : _a.getData('text')) || '';
    if (!/^[0-9A-Fa-f]*$/.test(pasteData) || selectedMemoryLine === -1) {
        return;
    }
    const memoryLines = $(".memory_hex");
    ;
    let address = selectedMemoryLine;
    while (pasteData.length > 0 && address < MEM_SIZE - 1) {
        const chunk = pasteData.slice(0, 4);
        pasteData = pasteData.slice(4);
        processor.set_memory_word(address, parseInt(chunk, 16));
        updateMemoryLine(address, parseInt(chunk, 16));
        address++;
        selectLine(address);
    }
});
for (let i = 0; i < 16; i++) {
    console.log("Adding memory line for address", i);
    addMemoryLine(i, "0000", "0000 0000 0000 0000", "NOP");
}
createRegister("PC", 0).appendTo($("#registers"));
createRegister("SP", 0).appendTo($("#registers"));
for (let i = 0; i < 16; i++) {
    createRegister("R" + i.toString().padStart(2, "0"), 0).appendTo($("#stack"));
}
(_a = document.getElementById("debug_button")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
    const memory_ptr = processor.get_memory_ptr();
    console.log("Memory pointer from processor:", memory_ptr);
    console.log("Memory contents at pointer:");
    let memory = wasm.memory;
    for (let i = 0; i < 16; i++) {
        const uint8View = new Uint8Array(memory.buffer, memory_ptr + i * 2, 2);
        console.log(uint8View);
    }
});
$("#step_button").on("click", () => {
    processor.step();
});
function getRegName(regIndex) {
    if (regIndex === 16)
        return "#reg_PC";
    if (regIndex === 17)
        return "#reg_SP";
    return "#reg_R" + regIndex.toString().padStart(2, '0');
}
processor.set_update_callback((update) => {
    switch (update.MemoryType) {
        case MemoryType.Reg:
            const regName = getRegName(update.Address);
            console.log("Updating register:", regName, "to value:", update.Value);
            const regDiv = $(regName);
            console.log("Found register div:", regDiv);
            regDiv.find(".register_value").text(update.Value.toString(16).toUpperCase().padStart(4, '0'));
            break;
    }
});
