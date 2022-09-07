# PSGConverter.php

PSGConverter.php is converter of Mabinogi MML to MIDI file script.

This program is from the era when QuickTime and Windows Media Player could be embedded with the embed tag, and it is now unusable in any browser.
Development has already moved to [Mabinogi MML Emulator](https://github.com/logue/MabiMmlEmu) and its base [smfplayer.js](https://github.com/logue/smfplayer.js) using Web Audio, and there will be no updates to this project in the future.

## Requirement

PHP 5.x or later.

## Download

<http://sf.net/projects/mabiassist/files/Appendix/PSGConverter211.7z> - v2.1.1 (2010/01/17)

## Usage

```plain
PSGConverter.php?i=[Instrumental Number]&s=[MML data (URL encoded]
```

### Extend Option

| Query Parameter | Description                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| p               | Panpod, Default is 64, (0~127)                                                                                                    |
| c               | Midi Channel, Default is 1.(1~16) If you use Drum part, this value become 10.                                                     |
| e               | Effect depth, Default is 40.(0~127)                                                                                               |
| r               | Append GM Reset Execute, (true or false) for fix QuickTime Player Noise                                                           |
| d               | The note is put in to sound only one scale. For example, it puts in with c=10&d=57 to sound cymbal(Scale is 57) with a drum part. |

## Example

Suppose that the following MML is played back. In addition, this MML is a main theme of Final Fantasy 9.

```plain
MML@
l64>d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&d&dv0d4t70v13l8d.e16fgl16<a>cdef8bb+l8bag.a16fedcd.e16fga4.b16b+16baag+a4.rd.e16fgl16<a>cdef8bb+l8bag.a16fedcf.l16fgfedl8cae.g16feeed4.r>d4<a>dc.<b16agaf16g16ab>c4crd4<a>dc.<b16agfaed16c+16d4dr>d4<a>dc.<b16agaf16g16ab>c4crd4<a>dc.<b16agfael16dc+d4t120d4,
r1v13l8a>ca4.c-16c16c-cc-d4c<afa4>ccd4cd16c16c-cdec<f16g16>er4.<a>ca4.c-16c16c-cc-d4c<afa>cd<brab+bab+g>c+<ba16g16f+ra4>cdcd<ab>cd4ec4er<a4>cdcd<aba4baa4ara4>cdcd<ab>cd4ec4er<a4>cdcd<ab>cd<eea4a4,
r1v13l8dcd4agee4d4d4cd4.ed4.ee4de4>d<ar4.dcd4agee4d4d4cd4e4fde4de4ed4.rd4efefd4f4dee4crd4efefd4fdeed4drd4efefd4f4dee4crd4efefd4fdl4bf+f+
;
```

First, URL encode to MML.

```plain
MML%40%0D%0Al64%3Ed%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26dv0d4t70v13l8d.e16fgl16%3Ca%3Ecdef8bb%2Bl8bag.a16fedcd.e16fga4.b16b%2B16baag%2Ba4.rd.e16fgl16%3Ca%3Ecdef8bb%2Bl8bag.a16fedcf.l16fgfedl8cae.g16feeed4.r%3Ed4%3Ca%3Edc.%3Cb16agaf16g16ab%3Ec4crd4%3Ca%3Edc.%3Cb16agfaed16c%2B16d4dr%3Ed4%3Ca%3Edc.%3Cb16agaf16g16ab%3Ec4crd4%3Ca%3Edc.%3Cb16agfael16dc%2Bd4t120d4%2C%0D%0Ar1v13l8a%3Eca4.c-16c16c-cc-d4c%3Cafa4%3Eccd4cd16c16c-cdec%3Cf16g16%3Eer4.%3Ca%3Eca4.c-16c16c-cc-d4c%3Cafa%3Ecd%3Cbrab%2Bbab%2Bg%3Ec%2B%3Cba16g16f%2Bra4%3Ecdcd%3Cab%3Ecd4ec4er%3Ca4%3Ecdcd%3Caba4baa4ara4%3Ecdcd%3Cab%3Ecd4ec4er%3Ca4%3Ecdcd%3Cab%3Ecd%3Ceea4a4%2C%0D%0Ar1v13l8dcd4agee4d4d4cd4.ed4.ee4de4%3Ed%3Car4.dcd4agee4d4d4cd4e4fde4de4ed4.rd4efefd4f4dee4crd4efefd4fdeed4drd4efefd4f4dee4crd4efefd4fdl4bf%2Bf%2B%0D%0A%3B%0D%0A
```

Next, a musical instrument is specified and PHP is passed as QueryString. Since this music is an object for flutes, the numerical value of a musical instrument is set to 73.

```plain
PSGConverter.php?i=73&s=MML%40%0D%0Al64%3Ed%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26d%26dv0d4t70v13l8d.e16fgl16%3Ca%3Ecdef8bb%2Bl8bag.a16fedcd.e16fga4.b16b%2B16baag%2Ba4.rd.e16fgl16%3Ca%3Ecdef8bb%2Bl8bag.a16fedcf.l16fgfedl8cae.g16feeed4.r%3Ed4%3Ca%3Edc.%3Cb16agaf16g16ab%3Ec4crd4%3Ca%3Edc.%3Cb16agfaed16c%2B16d4dr%3Ed4%3Ca%3Edc.%3Cb16agaf16g16ab%3Ec4crd4%3Ca%3Edc.%3Cb16agfael16dc%2Bd4t120d4%2C%0D%0Ar1v13l8a%3Eca4.c-16c16c-cc-d4c%3Cafa4%3Eccd4cd16c16c-cdec%3Cf16g16%3Eer4.%3Ca%3Eca4.c-16c16c-cc-d4c%3Cafa%3Ecd%3Cbrab%2Bbab%2Bg%3Ec%2B%3Cba16g16f%2Bra4%3Ecdcd%3Cab%3Ecd4ec4er%3Ca4%3Ecdcd%3Caba4baa4ara4%3Ecdcd%3Cab%3Ecd4ec4er%3Ca4%3Ecdcd%3Cab%3Ecd%3Ceea4a4%2C%0D%0Ar1v13l8dcd4agee4d4d4cd4.ed4.ee4de4%3Ed%3Car4.dcd4agee4d4d4cd4e4fde4de4ed4.rd4efefd4f4dee4crd4efefd4fdeed4drd4efefd4f4dee4crd4efefd4fdl4bf%2Bf%2B%0D%0A%3B%0D%0A
```

## License

Copyright © 2006-2012 by Logue.
Licensed under the GPL v2.

Notice: The newer version has been changed to MIT.
