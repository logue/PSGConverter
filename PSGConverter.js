/*!
 * PSGConverter.js
 * v1.1.1
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

// Based On えむえる

var insts = {
	'Lute':			{inst: 24,  max: 88, min: 16},	// 25.  Acoustic Guitar (nylon)
	'Ukulele':		{inst: 28,  max: 88, min: 16},	// 29.  Electric Guitar (muted)
	'Mandorin':		{inst: 105, max: 88, min: 16},	// 106. Banjo
	'Whistle':		{inst: 78,  max: 88, min: 60},	// 79.  Whistle
	'Flute':		{inst: 73,  max: 83, min: 48},	// 74.  Flute
	'Roncadora':	{inst: 77,  max: 83, min: 48},	// 78.  Shakuhachi
	'Chalumeau':	{inst: 71,  max: 59, min: 24},	// 72.  Clarinet
	'Tuba':			{inst: 58,  max: 59, min: 24},	// 59.  Tuba
	'Lyre':			{inst: 46,  max: 88, min: 16},	// 47.  Orchestral Harp
	'Snare':		{inst: 48,  max: 38, min: 38},	// Drum Part
	'Drum':			{inst: 48,  max: 40, min: 40},
	'Bass Drum':	{inst: 48,  max: 36, min: 36},
	'Cymbal':		{inst: 48,  max: 49, min: 49},
	'Xylophone':	{inst: 14,  max: 88, min: 16}	// 14.  Xylophone
};

(function($){	
	// 楽器セレクタ
	function inst_selecteor(selected_inst){
		var html = '<select class="inst" style="width:100px;">';
		for (var name in insts) {
			html += '<option value="'+insts[name].inst+'" '+((selected_inst == insts[name].inst) ? 'selected' : '')+'>'+name+'</option>';
		}
		html += '</select>'
		return html;
	}

	// MML>MIDI変換コアルーチン
	function mabimml_genmidi(param) {
		// param.inst midi楽器番号(0-127)
		// param.mml mml文字列の配列
		var dLength = 96;	// = 1quarternote = 32tick
		var Semibreve = dLength*4;	// 1小節
		var Minim = dLength*2;		// １拍（Tick連動）

		var nMin = 16, nMax = 88, isDrum = false;
		
		if (param.min || param.max){
			nMin = param.min;
			nMax = param.max;
		}

		var chid = isDrum ? 10 : 1;
		var inst = (param.inst >= 0 && param.inst < 128)? Math.round(param.inst): 0;
		var midi_msgs = [
		//	{'time':0,		'msg':String.fromCharCode(0xf0, 0x06, 0xF0, 0x7E, 0x7F, 0x09, 0x01, 0xF7, 0x8f, 0x00)},	// GM Reset F0 7E 7F 09 01 F7
			{'time':Minim,	'msg':String.fromCharCode(0xc0 + chid, inst)}	// 楽器変更
		];
		var noteTable = {'c':0,'d':2,'e':4,'f':5,'g':7,'a':9,'b':11};

		for(var partid = 0; partid < param.mml.length; partid++) {	// パートごとに処理
			var cLength = dLength;
			var cOctave = 4;
			var cVolume = 8;
			var cNote = 0;			// "&"記号処理用
			var tieEnabled = 0; // "&"記号処理用
			var time = Semibreve;		// 先頭を１小節あける。（ノイズがでるため）

			var part_msgs = [];
			
			var mml_notes = param.mml[partid].match(/[a-glnortvA-GLNORTV<>][\+\#-]?[0-9]*\.?&?/g);
			if (mml_notes == null) { continue; }
			for(var mnid=0; mnid < mml_notes.length; mnid++) {
				var mml_note = mml_notes[mnid];
				if(mml_note.match(/([lotvLOTV<>])([1-9][0-9]*|0?)(\.?)(&?)/)) {

					if(tieEnabled == 1 && RegExp.$4 != '&') {
						tieEnabled = 0;
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,cNote,Minim)});
					}
					switch(RegExp.$1){
						case 'L':
						case 'l':
							// 音長設定 Ln[.] (n=1～192)
							if(RegExp.$2 >= 1 && RegExp.$2 <= Minim) {
								cLength = Math.floor(Semibreve/RegExp.$2);
								if(RegExp.$3 == '.') {
									cLength = Math.floor(cLength*1.5);
								}
							}
							break;
						case 'O':
						case 'o':
							// オクターブ設定 On (n=1～8)
							if(RegExp.$2 >= 1 && RegExp.$2 <= 8) {
								cOctave = parseInt(RegExp.$2);
							}
							break;
						case 'T':
						case 't':
							// テンポ設定 Tn (n=32～255)
							if(RegExp.$2 >= 32 && RegExp.$2 <= 255) {
								part_msgs.push({'time':time, 'msg':String.fromCharCode(0xff,0x51,0x03)+mml_getBytes(Math.floor(60000000/RegExp.$2),3)});
							}
							break;
						case 'V':
						case 'v':
							//ボリューム調整
							if(RegExp.$2 != '' && RegExp.$2 >= 0 && RegExp.$2 <= 15) {
								cVolume = parseInt(RegExp.$2);
							}
							break;
						
						// 簡易オクターブ設定 {<>}
						case '<':
							cOctave = (cOctave<=1)? 1: (cOctave-1);
							break;
						case '>':
							cOctave = (cOctave>=8)? 8: (cOctave+1);
							break;
					}
				}
				
				if( mml_note.match(/([a-gnA-GN])([\+\#-]?)([0-9]*)(\.?)(&?)/) ) {
					var tick = cLength;
					var val = RegExp.$3;
					switch (RegExp.$1){
						case 'n': case 'N':
							// Nn, [A-G]数字なし -> Lで指定した長さに設定
							if((12<=val) && (val<=95)) note=val;
						break;
						default:
							// [A-G] 音名表記
							// 音符の長さ指定: n分音符→128分音符×tick数
							if(1<=val && val<=Minim) tick=Math.floor(Semibreve / val);	// L1 -> 384tick .. L64 -> 6tick
							if(RegExp.$4==".") tick=Math.floor(tick*1.5); // 付点つき -> 1.5倍

							if (!isDrum){
								// 音名→音階番号変換(C1 -> 12, C4 -> 48, ..)
								var note = 12*cOctave + noteTable[RegExp.$1.toLowerCase()];

								// 調音記号の処理
								switch(RegExp.$2){
									case '+':
									case '#':
										note++;
									break;
									case '-':
										note--;
									break;
								}
							}
						break;
					}
					
					if (!isDrum){
						// オクターブ調整（楽器の音域エミュレーション）
						while (note < nMin) note = note+12;
						while (note > nMax) note = note-12;
						note += 12; // 1オクターブ低く演奏される不具合を修正 060426
					}else{
						// ドラムパートの場合ノートを強制的に指定
						note = isDrum;
					}

					// c&dなど無効なタイの処理
					if(tieEnabled == true && note != cNote) {
						tieEnabled=false;
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,cNote,Minim)});	// NoteOff
					}

					// 前回タイ記号が無いときのみノートオン
					if(tieEnabled == false) 
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x90+chid,note,8*cVolume)});	// NoteOn

					time += tick;				// タイムカウンタを音符の長さだけ進める

					// ノートオフ命令の追加
					if(RegExp.$5=='&') {	// タイ記号の処理
						tieEnabled=true; 
						cNote=note; // 直前の音階を保存
					} else {
						tieEnabled=false;
						part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,note,Minim)});	// NoteOff
					}
				}else if(tieEnabled == 1) {	// 無効なタイの処理
					tieEnabled = false;
					part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,cNote,Minim)});	// NoteOff
				}
				
				// 休符設定 R[n][.] (n=1～64)
				if(mml_note.match(/[rR]([0-9]*)(\.?)/)) {
					tick=cLength; // 数字なし -> Lで指定した長さに設定
					var len = RegExp.$1;
					if(1<=len && len<=Minim) tick=Math.floor(Semibreve/len);	// L1 -> 128tick .. L64 -> 2tick
					if(RegExp.$2==".") tick=Math.floor(tick*1.5);	// 付点つき -> 1.5倍
					time += tick;									// タイムカウンタを休符の長さだけ進める
				}
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
			'MThd' + 
				String.fromCharCode(0,0,0,6,0,0,0,1,0,dLength) +
			'MTrk' + 
				mml_getBytes(midi_track.length,4) + 
				midi_track;
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
//		if (window.btoa){
//			return btoa(s);
//		}else{
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
//		}
	}
	
	function mml_player(param, autoplay, debug){
		var url = 'data:audio/midi;base64,'+base64encode(mabimml_genmidi(param) );
		return [
			(debug ? '<a class="btn btn-small mml-debug" href="'+url+'">debug.mid</a>' : ''),
			'<div class="mml-player">',
				'<object classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" codebase="http://www.apple.com/qtactivex/qtplugin.cab" width="240" height="16">',
					'<param name="controller" value="true" />',
					'<param name="autoplay" value="'+(autoplay ? true : false)+'" />',
					'<param name="src" value="'+url+'" />',
					'<param name="pluginspage" value="http://www.apple.com/quicktime/download/" />',
					'<object type="audio/midi" width="240" height="16" data="'+url+'">',
						'<param name="controller" value="true" />',
						'<param name="autoplay" value="'+(autoplay ? true : false)+'" />',
						'<param name="pluginspage" value="http://www.apple.com/quicktime/download/" />',
					'</object>',
				'</object>',
			'</div>'
		].join("\n");
	}

	$(document).ready(function(){
		$('.mabimml').each(function(){
			var self = this;
			var $this = $(this);
			var data = $this.data();
			var debug = data.debug;
			var param = {};
			
			if (data.instName !== '' && insts[data.instName] ){
				param = {
					inst : insts[data.instName].inst,
					max : insts[data.instName].max,
					min : insts[data.instName].min
				};
			}else if (data.inst !== ''){
				for (var name in insts) {
					if (insts[name].inst = data.inst){
						param = {
							inst : insts[name].inst,
							max : insts[name].max,
							min : insts[name].min
						};
						break;
					}
				}
			}
			console.log(param);
			param.mml = mml_sanitize($this.contents()[0].nodeValue);	// MML配列

			$this.before(mml_player(param,false, debug));
		});
	});
})(jQuery);