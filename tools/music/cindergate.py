# Cindergate loop sketch: D minor with a Phrygian Eb, 3+3+2 forge ostinato.
# Usage: python3 tools/music/cindergate.py out.mid  (needs mido). Render: fluidsynth with FluidR3_GM.sf2.
import mido, random, sys
random.seed(7)
BPM=84; TPB=480; BARS=8
mid=mido.MidiFile(ticks_per_beat=TPB)
ev={}  # track -> list of (tick, msg)
def T(name): return ev.setdefault(name,[])
def prog(tr,ch,p,vol=100,rev=60):
    T(tr).extend([(0,mido.Message('program_change',channel=ch,program=p)),
                  (0,mido.Message('control_change',channel=ch,control=7,value=vol)),
                  (0,mido.Message('control_change',channel=ch,control=91,value=rev))])
def note(tr,ch,n,start,dur,vel):
    vel=max(1,min(127,int(vel+random.randint(-5,5))))
    s=int(start*TPB); e=int((start+dur)*TPB)-6
    T(tr).append((s,mido.Message('note_on',channel=ch,note=n,velocity=vel)))
    T(tr).append((e,mido.Message('note_off',channel=ch,note=n,velocity=0)))
def cc(tr,ch,c,v,at): T(tr).append((int(at*TPB),mido.Message('control_change',channel=ch,control=c,value=int(v))))

# chords: (root midi in octave 2/3, tones) per half-bar
D,Eb,C,A,Bb,G=38,39,36,33,34,31
chords=[[(D,'Dm')]*2,[(Eb,'Eb')]*2,[(D,'Dm')]*2,[(C,'C'),(A,'A')],
        [(Bb,'Bb')]*2,[(G,'Gm')]*2,[(Eb,'Eb')]*2,[(A,'A')]*2]
TONES={'Dm':[0,3,7],'Eb':[0,4,7],'C':[0,4,7],'A':[0,4,7],'Bb':[0,4,7],'Gm':[0,3,7]}

prog('cello',0,42,105,40); prog('bass',1,43,95,40); prog('timp',2,47,110,50)
prog('str',3,48,80,90); prog('horn',4,60,110,80); prog('vln',5,40,90,90)
prog('choir',6,52,75,100); prog('anvil',7,14,70,70); prog('cel',8,8,70,110)
T('drums').append((0,mido.Message('control_change',channel=9,control=91,value=70)))

for b in range(BARS):
    t0=b*4
    # forge ostinato, 8 eighths, accents 3+3+2; 6th eighth leans on the half-step above
    for i in range(8):
        root=chords[b][0 if i<4 else 1][0]+12
        n=[root,root,root+7,root+12,root,root,root+1 if b%2==0 else root+8,root+12][i]
        acc=i in (0,3,6)
        note('cello',0,n,t0+i*0.5,0.42 if acc else 0.3,92 if acc else 62)
    for h in range(2):
        r=chords[b][h][0]
        if chords[b][0]==chords[b][1] and h==1: continue
        dur=4 if chords[b][0]==chords[b][1] else 2
        note('bass',1,r,t0+2*h,dur-0.05,80)
        # string pad: close voicing around D4
        q=chords[b][h][1]
        for iv in TONES[q]:
            p=r+24+iv
            while p<57: p+=12
            note('str',3,p,t0+2*h,dur-0.05,52 if b<4 else 64)
            if b>=4: note('choir',6,p+12 if p<62 else p,t0+2*h,dur-0.05,48+(b-4)*6)
    # timpani on the forge accents
    for i,v in ((0,96),(3,70),(6,82)):
        note('timp',2,chords[b][0 if i<4 else 1][0]+12 if chords[b][0 if i<4 else 1][0]+12<=53 else chords[b][0][0],t0+i*0.5,0.5,v)
    # anvil: hammer clang on beat 4 off, ring of a triangle echo
    note('anvil',7,74,t0+3.0,0.25,88 if b%2 else 72)
    note('drums',9,80,t0+3.5,0.2,55)
    if b>=6: note('anvil',7,74,t0+1.5,0.25,70)
    note('drums',9,35,t0,0.3,70 if b%4==0 else 50)
    # embers: celesta sparks on chord tones
    for _ in range(2 if b<4 else 3):
        q=chords[b][0][1]; r=chords[b][0][0]
        p=r+60+random.choice(TONES[q])+random.choice([0,12])
        note('cel',8,min(p,98),t0+random.choice([0.5,1.5,2.25,2.75,3.25]),0.4,random.randint(40,62))

mel=[[(62,1),(65,1),(69,2)],[(70,1.5),(67,.5),(63,2)],[(62,1),(65,1),(69,1),(74,1)],[(72,1.5),(70,.5),(69,2)],
     [(74,1.5),(72,.5),(70,2)],[(67,1),(70,1),(74,2)],[(75,1.5),(74,.5),(70,1),(67,1)],[(73,2),(69,2)]]
for b,bar in enumerate(mel):
    t=b*4
    for n,d in bar:
        v=78+(8 if b>=4 else 0)+(6 if d>=2 else 0)
        note('horn',4,n-12 if b<4 else n,t,d*0.97,v)
        if b>=4: note('vln',5,n+12,t,d*0.97,v-14)
# horn swell into bar 5, back down in bar 8 for the loop
for k in range(9):
    cc('horn',4,11,80+k*5,12+k*0.5); cc('horn',4,11,120-k*5,28+k*0.45)
end=BARS*4*TPB
for name,lst in ev.items():
    tr=mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('track_name',name=name))
    if name=='cello': tr.append(mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(BPM)))
    last=0
    for at,msg in sorted(lst,key=lambda x:(x[0],x[1].type=='note_on')):
        tr.append(msg.copy(time=at-last)); last=at
    tr.append(mido.MetaMessage('end_of_track',time=max(0,end-last)))
mid.save(sys.argv[1])
print('loop seconds', BARS*4*60/BPM)
