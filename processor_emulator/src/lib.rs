use wasm_bindgen::prelude::*;
use js_sys::Function;
use crate::{memory_update::{MemoryType, MemoryUpdate}, stack::*};
mod stack;
mod memory_update;
use web_sys::console;



#[wasm_bindgen]
pub enum Flag {
    Zero = 0b0000_0001,
    Carry = 0b0000_0010,
    Greater = 0b0000_0100,
    Less = 0b0000_1000,
}


#[wasm_bindgen]
pub struct Processor {
    stack: Stack,
    flags: u8,
    mem: [u16; 4096],
    PC: u16,
    ST: u8,

    callback: Option<Function>,
}


#[wasm_bindgen]
impl Processor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Processor {
        Processor {
            stack: Stack::new(),
            flags: 0,
            mem: [0; 4096],
            PC: 0,
            ST: 0,

            callback: None,
        }
    }

    // Implementation of a single step of the processor
    pub fn step(&mut self) {
        // Instruction fetch
        let instruction = self.mem[self.PC as usize];
        console::log_1(&format!("Fetched instruction `{:b}` at PC={}", instruction, self.PC).into());
        if instruction >> 15 & 1 == 1 {
            // Address instruction
            let opcode  = (instruction >> 12) & 0b1111;
            let address = instruction & 0b1111_1111_1111;
            console::log_1(&format!("Address instruction `{:b}` with address `{:b}`", opcode, address).into());
            match opcode {
                0b1000 => {
                    // Load
                    self.stack.push(self.mem[address as usize]);
                }
                0b1001 => {
                    // Store
                    self.mem[address as usize] = self.stack.pop();
                }
                _ => {}
            }
        } else {
            // Zero-address instruction
            let opcode  = instruction >> 8 & 0b1111_1111;
            let operand = instruction & 0b0000_0000_1111_1111;
            console::log_1(&format!("Zero-address instruction `{}`", opcode).into());
            match opcode {
                0b0000_0000 => {},    // NOP
                0b0000_0001 => {      // CMP
                    self.flags = 0;
                    match self.stack.top().cmp(&0) {
                        std::cmp::Ordering::Equal => {
                            self.flags |= Flag::Zero as u8;
                        },
                        std::cmp::Ordering::Greater => {
                            self.flags |= Flag::Greater as u8;
                        },
                        std::cmp::Ordering::Less => {
                            self.flags |= Flag::Less as u8;
                        }
                    }
                },
                0b0000_1111 => {      // DBG
                    console::log_1(&format!("DBG: ST={}, PC={}, Top={}", self.ST, self.PC, self.stack.top()).into());
                },

                0b0001_0000 => {      // PUSH(L)
                    self.stack.push(operand);
                },
                0b0001_0001 => {      // PUSHH
                    let top = self.stack.pop();
                    self.stack.push((operand << 8) | (top & 0x00FF));
                },
                0b0001_0100 => {      // DROP
                    self.stack.pop();
                },
                0b0001_0101 => {      // DUP
                    self.stack.push(self.stack.top());
                },
                0b0001_1000 => {      // SWAP
                    let a = self.stack.pop();
                    let b = self.stack.pop();
                    self.stack.push(a);
                    self.stack.push(b);
                },
                0b0001_1001 => {      // OVER
                    self.stack.push(self.stack.nos());
                },


                0b0010_0000 => {      // ADD
                    let a = self.stack.pop();
                    let b = self.stack.pop();
                    let c = a as u32 + b as u32;
                    if c > 0xFFFF {
                        self.flags |= Flag::Carry as u8;
                    }
                    self.stack.push(c as u16);
                },
                0b0010_0001 => {      // SUB
                    let a = self.stack.pop();
                    let b = self.stack.pop();
                    let c = b as i32 - a as i32;
                    if c < 0 {
                        self.flags |= Flag::Carry as u8;
                    }
                    self.stack.push(c as u16);
                },

                0b0100_0100 => {      // LOADI
                    let address = self.stack.pop();
                    self.stack.push(self.mem[address as usize]);
                }
                0b0100_0101 => {      // STOREI
                    let address = self.stack.pop();
                    let value   = self.stack.pop();
                    self.mem[address as usize] = value;
                }
                
                _ => { console::log_1(&format!("Unknown opcode `{}`", opcode).into()) }
            }
        }
        self.PC += 1;


        self.trigger_update(MemoryUpdate { MemoryType: MemoryType::Reg, Address: 16, Value: self.PC });
    }

    pub fn get_stack_ptr(&self) -> *const u16 {
        self.stack.ptr()
    }

    pub fn get_memory_ptr(&self) -> *const u16 {
        self.mem.as_ptr()
    }

    pub fn set_memory_word(&mut self, address: u16, value: u16) {
        console::log_1(&format!("Setting memory at address {} to value {:b}, mem size: {}", address, value, self.mem.len()).into());
        
        // self.mem[address as usize] = value;
        match self.mem.get_mut(address as usize) {
            Some(cell) => *cell = value,
            None => {
                console::log_1(&format!("Invalid address {}", address).into());
            }
        }
    }


    #[wasm_bindgen]
    pub fn set_update_callback(&mut self, callback: js_sys::Function) {
        self.stack.set_update_callback(callback);
    }

    pub fn trigger_update(&self, update: MemoryUpdate) {
        if let Some(ref cb) = self.stack.callback {
            let this = JsValue::NULL;
            let _ = cb.call1(&this, &JsValue::from(update));
        }
    }

    pub fn reset(&mut self) {
        self.PC = 0;
        self.ST = 0;
        self.flags = 0;
        self.stack = Stack::new();
        self.stack.trigger_update();
        self.trigger_update(MemoryUpdate { MemoryType: MemoryType::Reg, Address: 16, Value: 0 });
        self.trigger_update(MemoryUpdate { MemoryType: MemoryType::Reg, Address: 17, Value: 0 });
    }
}