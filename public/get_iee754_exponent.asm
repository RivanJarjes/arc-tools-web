	.begin
	.org 2048
prog:	ld  [flt], %r1
        sll	%r1, 1, %r1
	    srl	%r1, 24, %r1
	    sub	%r1, 127, %r1
	    st	%r1, [exp]
        halt

flt:	0xc14a0000
exp:	0x0
	.end
