.begin
	ld [len], %r1
	ld %r6, [len], %r2
	ld %r0+len, %r3 
	ld %r0+%r1, %r3
	ld %r0, %r1, %r3
	ld [len2], %r4
	ld %r2, [len2], %r5
	ld [len2], %r6
	ld %r1, %r2
	halt
	
len:	 -1
len2:	 20
.end
