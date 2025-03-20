.begin
!!! VARIABLES
! Console
BASE 	.equ 0x3fffc0
COUT 	.equ 0x0
CSTAT 	.equ 0x4
CIN	.equ 0x8
CICTL	.equ 0xc

!! Operators
PLUS_C 	.equ 0x2b
MINUS_C	.equ 0x2d
MULT_C	.equ 0x2a
DIV_C	.equ 0x2f
EXP_C	.equ 0x5e 

!! Important Characters
! Where 0 is at in hex, subtract this from ASCII to get number equivalent
OFFSET	.equ 0x30	
! New line ASCII
NEWLINE	.equ 0x0a

.org 2048
! Initializes console base
init:	sethi BASE, %r8

! Main program
	! Inputs
prog:	mov 	ins_string, %r5
	call 	print
	call 	input
	call 	valid_num
	st 	%r4, [ops]

	call 	input
	call 	valid_op
	st 	%r4, [ops+4]

	call 	input
	call 	valid_num
	st 	%r4, [ops+8]

	! Calculate numbers
	call 	calc

	! Tells user where to find result
	mov 	res_string, %r5
	call 	print
	halt

! Branches to new function based on operand
calc:	clr 	%r4
        ld      [ops],   %r1
        ld      [ops+4], %r2
        ld      [ops+8], %r3
	subcc 	%r2, PLUS_C, %r0
	be 	add_c
	subcc 	%r2, MINUS_C, %r0
	be 	sub_c
	subcc 	%r2, MULT_C, %r0
	be 	mult
	subcc 	%r2, DIV_C, %r0
	be 	div
	subcc 	%r2, EXP_C, %r0
	be 	exp

add_c:	add 	%r1, %r3, %r4
	jmpl 	%r15+4, %r0

sub_c:	sub 	%r1, %r3, %r4
	jmpl 	%r15+4, %r0

mult: 	subcc 	%r3, 1, %r3
	bl 	return
	add 	%r1, %r4, %r4
	ba 	mult

div:	subcc   %r3, 0, %r0
        ble     error
div_l:  subcc 	%r1, %r3, %r0
        bl 	return
        subcc 	%r1, %r3, %r1
        inc 	%r4
        ba 	div_l

exp:	mov     %r1, %r4
        subcc   %r3, 1, %r0
        bg      exp_l1
        mov     %r1, %r4
        subcc   %r3, 0, %r0
        bg      return
        add     %r0, 1, %r4
        ba      return
exp_l1:	subcc 	%r3, 1, %r3
	ble 	return
        ld      [ops], %r2
        mov     %r4, %r1
	clr 	%r4
exp_l2: add 	%r1, %r4, %r4
	subcc 	%r2, 1, %r2
	bg 	exp_l2
	ba 	exp_l1

! prints whatever string address is at %r5
! %r5 - current string, %r6 - current character, %r7 - current address
! %r8 - console base address, %r9 - console status
print:	clr 	%r6
	clr	%r7
p_loop:	ld 	[%r5 + %r6], %r7
	orcc 	%r7, %r0, %r0
	bne 	p_wait
	jmpl 	%r15+4, %r0
p_wait:	ldub 	[%r8 + CSTAT], %r9
	andcc 	%r9, 0x80, %r9
	be 	p_wait
		
	stb 	%r7, [%r8 + COUT]
	add 	%r6, 4, %r6
	ba 	p_loop

! Input string: gets input and prints character + new line
! %r5 - cin status, %r6 - inputted character, %r7 - cout status
! %r8 - console base address
input:	clr 	%r4
	clr 	%r5
	clr 	%r6
	clr	%r7
i_wait:	ldub 	[%r8 + CICTL], %r5
	andcc 	%r5, 0x80, %r5
	be 	i_wait
	ldub 	[%r8 + CIN], %r6
i_out:	ldub 	[%r8 + CSTAT], %r7
	andcc 	%r7, 0x80, %r7
	be 	i_out
	stb 	%r6, [%r8 + COUT]
	mov 	%r6, %r4 
	jmpl    %r15+4, %r0

! Checks if number in %r4 is valid and converts it from its hex address to decimal value, if not, goes to error
valid_num:	subcc 	%r4, OFFSET, %r4
		bneg 	error
		subcc 	%r4, 10, %r0
		bpos 	error
		jmpl 	%r15+4, %r0

! Checks if operand is valid, if not, goes to error
valid_op:       subcc	%r4, PLUS_C, %r0
                be 	return
                subcc 	%r4, MINUS_C, %r0
                be 	return
                subcc 	%r4, MULT_C, %r0
                be 	return
                subcc 	%r4, DIV_C, %r0
                be 	return
                subcc 	%r4, EXP_C, %r0
                be 	return
                ba 	error

! Returns to main scirpt
return: jmpl    %r15+4, %r0	

! Prints error message
error: 	mov 	err_string, %r5
        call 	print
        halt

!!! DATA
.org 	3000

! Operand and Operator data
ops:    .dwb 3

! Instruction String: "Please begin by typing a positive, single digit number (0-9), followed by a mathematic operator ('+', '-', '*', '/', '^'), followed by another positive single digit number.\n"
ins_string:     0x50, 0x6c, 0x65, 0x61
                0x73, 0x65, 0x20, 0x62
                0x65, 0x67, 0x69, 0x6e
                0x20, 0x62, 0x79, 0x20
                0x74, 0x79, 0x70, 0x69
                0x6e, 0x67, 0x20, 0x61
                0x20, 0x70, 0x6f, 0x73
                0x69, 0x74, 0x69, 0x76
                0x65, 0x2c, 0x20, 0x73
                0x69, 0x6e, 0x67, 0x6c
                0x65, 0x20, 0x64, 0x69
                0x67, 0x69, 0x74, 0x20
                0x6e, 0x75, 0x6d, 0x62
                0x65, 0x72, 0x20, 0x28
                0x30, 0x2d, 0x39, 0x29
                0x2c, 0x20, 0x66, 0x6f
                0x6c, 0x6c, 0x6f, 0x77
                0x65, 0x64, 0x20, 0x62
                0x79, 0x20, 0x61, 0x20
                0x6d, 0x61, 0x74, 0x68
                0x65, 0x6d, 0x61, 0x74
                0x69, 0x63, 0x20, 0x6f
                0x70, 0x65, 0x72, 0x61
                0x74, 0x6f, 0x72, 0x20
                0x28, 0x27, 0x2b, 0x27
                0x2c, 0x20, 0x27, 0x2d
                0x27, 0x2c, 0x20, 0x27
                0x2a, 0x27, 0x2c, 0x20
                0x27, 0x2f, 0x27, 0x2c
                0x20, 0x27, 0x5e, 0x27
                0x29, 0x2c, 0x20, 0x66
                0x6f, 0x6c, 0x6c, 0x6f
                0x77, 0x65, 0x64, 0x20
                0x62, 0x79, 0x20, 0x61
                0x6e, 0x6f, 0x74, 0x68
                0x65, 0x72, 0x20, 0x70
                0x6f, 0x73, 0x69, 0x74
                0x69, 0x76, 0x65, 0x20
                0x73, 0x69, 0x6e, 0x67
                0x6c, 0x65, 0x20, 0x64
                0x69, 0x67, 0x69, 0x74
                0x20, 0x6e, 0x75, 0x6d
                0x62, 0x65, 0x72, 0x2e
                0x0a, 0

! Result String: "\nYour result is in register 4!"
res_string:     0x0a, 0x59, 0x6f, 0x75, 0x72
                0x20, 0x72, 0x65, 0x73
                0x75, 0x6c, 0x74, 0x20
                0x69, 0x73, 0x20, 0x69
                0x6e, 0x20, 0x72, 0x65
                0x67, 0x69, 0x73, 0x74
                0x65, 0x72, 0x20, 0x34
                0x21, 0

! Invalid String: "\nInvalid input!"
err_string:	0x0a, 0x49, 0x6e, 0x76, 0x61
                0x6c, 0x69, 0x64, 0x20
                0x69, 0x6e, 0x70, 0x75
                0x74, 0x21, 0

.end
