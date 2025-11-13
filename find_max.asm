PUSH 21 ; X
DUP     ; X X
LOADI   ; X N
OVER    ; X N X
ADD     ; X end
PUSH 0  ; X end max
ROT     ; end max X
INC     ; end max i

loop:   ; end max i
DUP     ; end max i i
LOADI   ; end max i n
ROT     ; end i n max
DUP     ; end i n max max
ROT     ; end i max max n
CMP     ; end i max
JL update_max
SWAP    ; end max i

check_end:
INC     ; end max i
ROT     ; max i end
OVER    ; max i end i
OVER    ; max i end i end
CMP     ; max i end
JG end
ROT
ROT     ; end max i
JMP loop

update_max: ; end i max
DROP    ; end i
DUP     ; end i i
LOADI   ; end i max
SWAP    ; end max i
JMP check_end

end:    ; max i end
DROP
DROP
STOP

; data
; 000a
; 00010002000300040003
; 00020001000000050001