import init, { Processor, MemoryUpdate, MemoryType } from "../../processor_emulator/pkg/processor_emulator.js";
import { assembleString, decodeInstruction, assemble, opcodeNames, getLabels } from "./assembler.js";
/// <reference types="jquery" />

const wasm = await init();
const processor = new Processor();
console.log("Processor initialized:", processor);

const MEM_SIZE = 4096;


let selectedMemoryLine: number = -1;

function addMemoryLine(address: number, hex: string, bin: string, meaning: string) {
    const memoryDiv = $("#memory")
    if (!memoryDiv) return;

    $("<div>", { class: "memory_line" }).append(
        $("<span>", { class: "memory_address", text: address.toString(16).toUpperCase().padStart(3, '0') }),
        $("<span>", { class: "memory_hex", text: hex }).on("click", function() {
            selectLine(address);
        }),
        $("<span>", { class: "memory_bin", text: bin }),
        $("<input>", { class: "memory_meaning", text: meaning }).on("focus", () => {
            selectLine(-1);
        }).on("keydown", (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                const assembledValue = assembleString((e.target as HTMLInputElement).value);
                processor.set_memory_word(address, assembledValue);
                updateMemoryLine(address, assembledValue);
                $(".memory_line").eq(address + 1).find(".memory_meaning").focus();
            }
        })
    ).appendTo(memoryDiv);
}

function createRegister(name: string, value: number) {
    return $("<div>", { class: "register", id: "reg_" + name }).append(
        $("<span>", { class: "register_name", text: name }),
        $("<span>", { class: "register_value", text: value.toString(16).toUpperCase().padStart(4, '0') })
    );
}

const posibleKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];

function ensureLineExists(address: number) {
    let memoryLines = document.querySelectorAll(".memory_hex");
    while (address >= memoryLines.length) {
        addMemoryLine(address, "0000", "0000 0000 0000 0000", "NOP");
        memoryLines = document.querySelectorAll(".memory_hex");
    }
}

function selectLine(address: number) {
    ensureLineExists(address);
    let memoryLines = document.querySelectorAll(".memory_hex");
    memoryLines.forEach(l => l.classList.remove("selected"));
    if (address != -1) memoryLines[address].classList.add("selected");
    selectedMemoryLine = address;
}

function updateMemoryLine(address: number, value: number) {
    ensureLineExists(address);
    const line = $(".memory_line").eq(address);
    line.find(".memory_hex").text(value.toString(16).toUpperCase().padStart(4, '0'));
    line.find(".memory_bin").text(value.toString(2).padStart(16, '0').match(/.{1,4}/g)?.join(' ') || '');
    line.find(".memory_meaning").val(decodeInstruction(value));
}

document.addEventListener("keydown", (event) => {
    if (selectedMemoryLine === -1) return;
    if (event.key === "ArrowUp") {
        if (selectedMemoryLine > 0) {
            selectLine(selectedMemoryLine - 1);
        }
    } else if (event.key === "ArrowDown") {
        selectLine(selectedMemoryLine + 1);
    } else if (event.key === "Enter") {
        console.log("Selected memory line:", selectedMemoryLine);
    } else if (posibleKeys.includes(event.key.toUpperCase())) {
        const memoryLines = document.querySelectorAll(".memory_hex");
        const selectedLine = memoryLines[selectedMemoryLine];
        if ((selectedLine.textContent?.length ?? 0) >= 4) {
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
    let pasteData = event.clipboardData?.getData('text')
                                        .split("\n")
                                        .map(str => {
                                            let parts = str.split(";");
                                            return parts[parts.length-1].trim();
                                        })
                                        .join("") || '';
    if (!/^[0-9A-Fa-f]*$/.test(pasteData) || selectedMemoryLine === -1) {
        return;
    }
    const memoryLines = $(".memory_hex");;
    let address = selectedMemoryLine;
    while (pasteData.length > 0 && address < MEM_SIZE - 1) {
        const chunk = pasteData.slice(0, 4);
        pasteData = pasteData.slice(4);
        processor.set_memory_word(address, parseInt(chunk, 16));
        updateMemoryLine(address, parseInt(chunk, 16));
        address++;
        selectLine(address);
    }
})


for (let i = 0; i < 16; i++) {
    console.log("Adding memory line for address", i);
    addMemoryLine(i, "0000", "0000 0000 0000 0000", "NOP");
}
createRegister("PC", 0).appendTo($("#registers"));
createRegister("SP", 0).appendTo($("#registers"));
for (let i = 0; i < 16; i++) {
    createRegister("R" + i.toString().padStart(2, "0"), 0).appendTo($("#stack"));
}


document.getElementById("debug_button")?.addEventListener("click", () => {
    const memory_ptr = processor.get_memory_ptr();
    console.log("Memory pointer from processor:", memory_ptr);
    console.log("Memory contents at pointer:");
    let memory = wasm.memory;
    for (let i = 0; i < 16; i++) {
        const uint8View = new Uint8Array(memory.buffer, memory_ptr + i * 2, 2);
        console.log(uint8View);
    }
})
$("#step_button").on("click", () => {
    processor.step();
});
$("#reset_button").on("click", () => {
    if (runInterval !== 0) {
        clearInterval(runInterval);
    }
    processor.reset();
});

// Zero = 0b0000_0001,
// Carry = 0b0000_0010,
// Greater = 0b0000_0100,
// Less = 0b0000_1000,

function getRegName(regIndex: number): string {
    if (regIndex === 16) return "#reg_PC";
    if (regIndex === 17) return "#reg_SP";
    if (regIndex === 18) return "#flags";
    return "#reg_R" + regIndex.toString().padStart(2, '0');
}

function setFlags(flags: number) {
    let flagNames = ["Z", "C", "G", "L"];   
    for (let i = 0; i < flagNames.length; i++) {
        const flagDiv = $(`#flag_${flagNames[i]}`);
        if ((flags & (1 << i)) !== 0) {
            flagDiv.addClass("flag_set");
        } else {
            flagDiv.removeClass("flag_set");
        }
    }
}

processor.set_update_callback((update: MemoryUpdate) => {
    switch (update.MemoryType) {
        case MemoryType.Reg:
            const regName = getRegName(update.Address);
            console.log("Updating register:", regName, "to value:", update.Value);
            if (regName === "#flags") {
                setFlags(update.Value);
                if ((update.Value & 0b0001_0000) !== 0) {
                    if (runInterval !== 0) {
                        clearInterval(runInterval);
                    }
                }
                return;
            }
            if (regName === "#reg_SP") {
                const stackDiv = $("#stack");
                const sp = update.Value;
                stackDiv.find(".register").each((index, element) => {
                    if (index < sp) {
                        $(element).addClass("active");
                    } else {
                        $(element).removeClass("active");
                    }
                });
            } else if (regName === "#reg_PC") {
                $(".memory_line").removeClass("executing");
                const executingLine = $(".memory_line").eq(update.Value);
                executingLine.addClass("executing");
            }
            const regDiv = $(regName);
            console.log("Found register div:", regDiv);
            regDiv.find(".register_value").text(update.Value.toString(16).toUpperCase().padStart(4, '0'));
            break;
    }
});

$("#code").on("input", (e) => {
    console.log("Code input changed");
    const codeLines = (e.target as HTMLTextAreaElement).value.split("\n").length;
    let lineNumbers = "";
    for (let i = 1; i <= codeLines; i++) {
        lineNumbers += i + "\n";
    }
    $("#code_line_numbers pre").text(lineNumbers);
}).on("focus", () => {
    selectLine(-1);
});

$("#assemble_button").on("click", () => {
    const code = ($("#code").val() as string) || "";
    const machineCode = assemble(code);
    console.log("Assembled machine code:", machineCode);
    for (let i = 0; i < machineCode.length; i++) {
        processor.set_memory_word(i, machineCode[i]);
        updateMemoryLine(i, machineCode[i]);
    }
    selectLine(0);
});


const TestRegex = new RegExp(`\\b(${Array.from(opcodeNames).filter(opcode => opcode != '-').map(opcode => 
    opcode.split("").map(c => "[" + c.toLowerCase() + c.toUpperCase() + "]").join("")
).join('|')})\\b`, 'g');

function highlightSyntax(text: string) {
    const labels = getLabels(text);
    let labelsRegex = new RegExp(`\\b(${labels.join("|")})\\b`, 'g');
    console.log("LabelsRegex:", labelsRegex);
    return text.split("\n").map(line => {
        const commentIndex = line.indexOf(";");
        let codePart = commentIndex === -1 ? line : line.slice(0, commentIndex);
        let commentPart = commentIndex === -1 ? "" : line.slice(commentIndex);
        codePart = codePart
               .replace(/\b[a-zA-Z_]+:/g, '<span class="token-label">$&</span>')
               .replace(labelsRegex, '<span class="token-label">$&</span>')
               .replace(/\b[\da-fA-F]+\b/g, '<span class="token-number">$&</span>')
               .replace(TestRegex, '<span class="token-opcode">$1</span>')
        if (commentPart.length > 0) {
            commentPart = `<span class="token-comment">${commentPart}</span>`;
        }
        return codePart + commentPart;
    }).join("\n");
}

$("#code")
    .on("input", (e) => {
        $("#highlight").html(highlightSyntax((e.target as HTMLTextAreaElement).value));
    }).on("scroll", (e) => {
        $("#highlight").scrollTop((e.target as HTMLTextAreaElement).scrollTop);
    });


let runInterval: number = 0;
function start(runIntervalDuration: number) {
    if (runInterval !== 0) {
        clearInterval(runInterval);
    }
    runInterval = setInterval(() => {
        processor.step();
    }, runIntervalDuration);
}
$("#run_button").on("click", async () => {
    start($("#run_interval_input").val() as number);
});
$("#run_interval_input").on("change", (e) => {
    if (runInterval !== 0) {
        clearInterval(runInterval);
        start((e.target as HTMLInputElement).valueAsNumber);
    }
}); 