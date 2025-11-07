use wasm_bindgen::JsValue;
use crate::memory_update::*;
use web_sys::console;


pub struct Stack {
    data: [u16; 16],
    SP: usize,
    pub callback: Option<js_sys::Function>,
}

impl Stack {
    pub fn new() -> Stack {
        Stack { data: [0; 16], SP: 0, callback: None }
    }

    pub fn ptr(&self) -> *const u16 {
        self.data.as_ptr()
    }

    pub fn push(&mut self, value: u16) {
        if self.SP < self.data.len() {
            self.data[self.SP] = value;
            self.SP += 1;
        } else {
            console::log_1(&"Stack overflow".into());
            panic!("Stack overflow");
        }
        self.trigger_update();
    }

    pub fn pop(&mut self) -> u16 {
        let value: u16;
        if self.SP > 0 {
            self.SP -= 1;
            value = self.data[self.SP];
            self.data[self.SP] = 0;
        } else {
            console::log_1(&"Stack underflow".into());
            panic!("Stack underflow");
        }
        self.trigger_update();
        return value;
    }

    pub fn top(&self) -> u16 {
        if self.SP > 0 {
            self.data[self.SP - 1]
        } else {
            console::log_1(&"Stack is empty".into());
            panic!("Stack is empty");
        }
    }

    pub fn nos(&self) -> u16 {
        if self.SP > 1 {
            self.data[self.SP - 2]
        } else {
            panic!("Not enough elements in stack");
        }
    }

    pub fn set_update_callback(&mut self, callback: js_sys::Function) {
        self.callback = Some(callback);
    }

    pub fn trigger_update(&self) {
        if let Some(cb) = &self.callback {
            let _ = cb.call0(&JsValue::NULL);
            for reg_index in 0..15 {
                let update = MemoryUpdate {
                    MemoryType: MemoryType::Reg,
                    Address: reg_index as u16,
                    Value: self.data[reg_index],
                };
                let _ = cb.call1(&JsValue::NULL, &JsValue::from(update));
            }
        }

        if let Some(ref cb) = self.callback {
            let this = JsValue::NULL;
            let _ = cb.call1(&this, &JsValue::from(MemoryUpdate {
                MemoryType: MemoryType::Reg,
                Address: 17,
                Value: self.SP as u16,
            }));
        }
    }
}