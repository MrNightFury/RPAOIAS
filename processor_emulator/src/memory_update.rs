use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum MemoryType {
    Mem, Reg, 
}


#[wasm_bindgen]
pub struct MemoryUpdate {
    pub MemoryType: MemoryType,
    pub Address: u16,
    pub Value: u16,
}