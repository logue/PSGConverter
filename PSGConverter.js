/*!
 * PSGConverter.js
 * Copyright (c)2007-2012 Logue <http://logue.be/> All rights reserved.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function($){
	// MML>MIDI変換コアルーチン
	// original scripts:
	// PHP MIDI Class: http://staff.dasdeck.de/valentin/midi/
	// PSGConverter.php: http://www.annie.ne.jp/~tamanegi/
	// Modified by Logue (http://logue.be/)
	function mabimml_genmidi(param) {
		// param.inst midi楽器番号(0-127)
		// param.mml mml文字列の配列

		// 0x80 ノートオフ
		// 0x90 ノートオン
		var chid = 0;
		var inst = (param.inst >= 0 && param.inst < 128)? Math.floor(param.inst): 0;
		var midi_msgs = [{'time':0,'msg':String.fromCharCode(0xc0+chid,inst)}];
		var noteTable = {'c':0,'d':2,'e':4,'f':5,'g':7,'a':9,'b':11};
		var dLength = 96;	// = 1quarternote = 32tick
		for(var partid = 0; partid < param.mml.length; partid++) {
			var cLength = dLength;
			var cOctave = 4;
			var cVolume = 8;
			var cNote = 0;			// "&"記号処理用
			var tieEnabled = 0; // "&"記号処理用

			var Semibreve = dLength*4;	// 1小節
			var Minim = dLength*2;		// １拍（Tick連動）
			var time = Semibreve;		// 先頭を１小節あける。

			var part_msgs = [];
			//part_msgs.push({'time':0, 'msg':String.fromCharCode(0x80+chid,0xf0,0x7e,0x7f,0x09,0x01,0xf7)});
			var mml_notes = param.mml[partid].match(/[abcdefglnortvABCDEFGLNORTV<>][\+\#-]?[0-9]*\.?&?/g);
			if (mml_notes == null) { continue; }
			for(var mnid=0; mnid < mml_notes.length; mnid++) {
				var mml_note = mml_notes[mnid];
				if(mml_note.match(/([lotLOT<>])([1-9][0-9]*|0?)(\.?)(&?)/)) {

					if(tieEnabled == 1 && RegExp.$4 != '&') {
						tieEnabled = 0;
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,cNote,Minim)});
					}
					switch(RegExp.$1){
					case 'T':
					case 't':
						if(RegExp.$2 >= 32 && RegExp.$2 <= 255) {
							part_msgs.push({'time':time, 'msg':String.fromCharCode(0xff,0x51,0x03)+mml_getBytes(Math.floor(60000000/RegExp.$2),3)});
						}
						break;
					case 'L':
					case 'l':
						if(RegExp.$2 >= 1 && RegExp.$2 <= Minim) {
							cLength = Math.floor(Semibreve/RegExp.$2);
							if(RegExp.$3 == '.') {
								cLength = Math.floor(cLength*1.5);
							}
						}
						break;
					case 'O':
					case 'o':
						if(RegExp.$2 >= 1 && RegExp.$2 <= 8) {
							cOctave = parseInt(RegExp.$2);
						}
						break;
					case '<':
						cOctave = (cOctave<=1)? 1: (cOctave-1);
						break;
					case '>':
						cOctave = (cOctave>=8)? 8: (cOctave+1);
						break;
					}
				} else if(mml_note.match(/([rvRV])([1-9][0-9]*|0?)(\.?)/)) {
					if(tieEnabled == 1) {
						tieEnabled = 0;
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,cNote,Minim)});	// NoteOff
					}
					switch(RegExp.$1){
					case 'V':
					case 'v':
						//ボリューム調整
						if(RegExp.$2 != '' && RegExp.$2 >= 0 && RegExp.$2 <= 15) {
							cVolume = parseInt(RegExp.$2);
						}
						break;
					case 'R':
					case 'r':
						if(RegExp.$2 >= 1 && RegExp.$2 <= Minim) {
							var tick = Math.floor(Semibreve/RegExp.$2);
							time += (RegExp.$3 == '.')? Math.floor(tick*1.5): tick;
						} else if(RegExp.$2 == '') {
							time += (RegExp.$3 == '.')? Math.floor(cLength*1.5): cLength;
						}
						break;
					}
				} else if(mml_note.match(/([nN])(0|[1-8][0-9]?|9[0-6]?)(&?)/)) {
					// ノート番号直接入力
					var note = parseInt(RegExp.$2) + 12;
					if(tieEnabled == 1 && note != cNote) {
						tieEnabled = 0;
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,cNote,Minim)});	// NoteOff
					}
					if(tieEnabled == 0) {
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x90+chid,note,8*cVolume)});	// NoteOn
					}
					time += cLength;
					if(RegExp.$3 == '&') {
						tieEnabled = 1;
						cNote = note;
					} else {
						tieEnabled = 0;
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,note,Minim)});	// NoteOff
					}
				} else if(mml_note.match(/([abcdefgABCDEFG])([\+\#-]?)([1-9][0-9]*|0?)(\.?)(&?)/)) {
					// 音名表記
					var note = 12*cOctave + noteTable[RegExp.$1.toLowerCase()] + 12;	// 1オクターブ上げる
					// 半音
					if(RegExp.$2 == '+' || RegExp.$2 == '#') {
						note += 1;
					} else if(RegExp.$2 == '-') {
						note -= 1;
					}
					var tick = cLength;
					if(RegExp.$3 != '' && RegExp.$3 >= 1 && RegExp.$3 <= Minim) {
						tick = Math.floor(Semibreve/RegExp.$3);
					}
					if(RegExp.$4 == '.') {
						tick = Math.floor(tick*1.5);
					}
					if(tieEnabled == 1 && note != cNote) {
						tieEnabled = 0;
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,cNote,Minim)});	// NoteOff
					}
					if(tieEnabled == 0) {
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x90+chid,note,8*cVolume)});	// NoteOn
					}
					time += tick;
					if(RegExp.$5 == '&') {
						tieEnabled = 1;
						cNote = note;
					} else {
						tieEnabled = 0;
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,note,Minim)});	// NoteOff
					}
				}
			}
			if(tieEnabled == 1) {	// 無効なタイの処理
				tieEnabled = 0;
				part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,cNote,Minim)});	// NoteOff
			}
			// マージ
			var merge_msgs = [];
			while(midi_msgs.length > 0 || part_msgs.length > 0) {
				if(part_msgs.length == 0 || midi_msgs.length > 0 && (midi_msgs[0].time <= part_msgs[0].time)) {
					merge_msgs.push(midi_msgs.shift());
				} else {
					merge_msgs.push(part_msgs.shift());
				}
			}
			midi_msgs = merge_msgs;
		}
		var midi_track = '';
		var last_time = 0;
		for(var mmid = 0; mmid < midi_msgs.length; mmid++) {
			var dt = midi_msgs[mmid].time - last_time;
			last_time = midi_msgs[mmid].time;
			midi_track += mml_writeVarLen(dt) + midi_msgs[mmid].msg;
		}
		midi_track += mml_writeVarLen(dLength);	// 末尾に四分音符
		midi_track += String.fromCharCode(0xff,0x2f,0x00); // TrkEnd;

		// dataを返す
		var ret =
			'MThd' + String.fromCharCode(0,0,0,6,0,0,0,1,0,dLength) +
			'MTrk' + mml_getBytes(midi_track.length,4) + midi_track;

		return ret;
	}

	//// Utilities
	// int to bytes (length: len)
	var mml_getBytes = function(n, len){
		var buf = parseInt(n);
		var str = '';
		for(var i=0; i<len; i++) {
			str = String.fromCharCode(buf & 0xff) + str;
			buf >>>= 8;
		}
		return str;
	}
	// int to variable length string
	var mml_writeVarLen = function(value){
		var buf = parseInt(value);
		var str = String.fromCharCode(buf & 0x7f);
		buf >>>= 7;
		while(buf > 0) {
			str = String.fromCharCode(0x80 + (buf & 0x7f)) + str;
			buf >>>= 7;
		}
		return str;
	}

	//MMLを正規化
	function mml_sanitize(str) {
		var data = str.match(/MML\@\s*([\s0-9a-glnortvA-GLNORTV#<>.&+-]*),\s*([\s0-9a-glnortvA-GLNORTV#<>.&+-]*),\s*([\s0-9a-glnortvA-GLNORTV#<>.&+-]*);/);
		return [data[1],data[2],data[3]];
	}

	// BASE64 (RFC2045) Encode/Decode for string in JavaScript
	// Version 1.2 Apr. 8 2004 written by MIZUTANI Tociyuki
	// Copyright 2003-2004 MIZUTANI Tociyuki
	// http://tociyuki.cool.ne.jp/archive/base64.html

	function base64encode(s){
		if (window.btoa){
			return btoa(s);
		}else{
			var base64list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
			var t = '', p = -6, a = 0, i = 0, v = 0, c;
			while ( (i < s.length) || (p > -6) ) {
				if ( p < 0 ) {
					if ( i < s.length ) {
						c = s.charCodeAt(i++);
						v += 8;
					} else {
						c = 0;
					}
					a = ((a&255)<<8)|(c&255);
					p += 8;
				}
				t += base64list.charAt( ( v > 0 )? (a>>p)&63 : 64 )
				p -= 6;
				v -= 6;
			}
			return t;
		}
	}

	$(document).ready(function(){
		$('.mabimml').each(function(){
			var $this = $(this);
			var MML = mml_sanitize($this.contents()[0].nodeValue);	// MML配列
			var inst = $this.data().inst;	// 楽器
			var url = 'data:audio/midi;base64,'+base64encode(mabimml_genmidi({"inst":inst,"mml":MML}) );
			$this.before([
				'<a class="btn btn-small mml-debug" href="'+url+'">'+$this.attr('title')+'.mid</a>',
				'<object classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" codebase="http://www.apple.com/qtactivex/qtplugin.cab" width="320" height="16" class="mml-player">',
					'<param name="controller" value="true" />',
					'<param name="autoplay" value="true" />',
					'<param name="src" value="'+url+'" />',
					'<param name="pluginspage" value="http://www.apple.com/quicktime/download/" />',
					'<object type="audio/midi" width="320" height="16" data="'+url+'">',
						'<param name="controller" value="true" />',
						'<param name="autoplay" value="false" />',
						'<param name="pluginspage" value="http://www.apple.com/quicktime/download/" />',
					'</object>',
				'</object>'
			].join("\n"));
		});
	});
})(jQuery);