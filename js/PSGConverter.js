/*!
 * PSGConverter.js
 * v1.1.2
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
(function ($, window, document) {
	var isMSIE = /*@cc_on!@*/false;
	var locale = (navigator.userLanguage||navigator.browserLanguage||navigator.language).substr(0,2);

	var insts = {
		'Lute':			{inst: 24,  max: 88, min: 16},	// 25.  Acoustic Guitar (nylon)
		'Ukulele':		{inst: 28,  max: 88, min: 16},	// 29.  Electric Guitar (muted)
		'Mandorin':		{inst: 105, max: 88, min: 16},	// 106. Banjo
		'Whistle':		{inst: 72,  max: 88, min: 60},	// 73.  Piccolo
		'Flute':		{inst: 73,  max: 83, min: 48},	// 74.  Flute
		'Roncadora':	{inst: 77,  max: 83, min: 48},	// 78.  Shakuhachi
		'Chalumeau':	{inst: 71,  max: 59, min: 24},	// 72.  Clarinet
		'Tuba':			{inst: 58,  max: 59, min: 24},	// 59.  Tuba
		'Lyre':			{inst: 46,  max: 88, min: 16},	// 47.  Orchestral Harp
		'Snare':		{inst: 48,  max: 38, min: 38},	// 49.  Orchestra Kit (Concert SD)
		'Drum':			{inst: 48,  max: 40, min: 40},	// 49.  Orchestra Kit (Concert SD)
		'Bass Drum':	{inst: 48,  max: 35, min: 35},	// 49.  Orchestra Kit (Gran Casa)
		'Cymbal':		{inst: 48,  max: 57, min: 57},	// 49.  Orchestra Kit (Hand Cymbal)
		'Xylophone':	{inst: 15,  max: 88, min: 16}	// 14.  Xylophone
	};
	
	var messages = {
		'en' : {
			'Rank'		: 'Rank',
			'Inst'		: 'Instrument',
			'Melody'	: 'Melody',
			'Chord1'	: 'Chord 1',
			'Chord2'	: 'Chord 2',
			
			'rewind'	: 'Rewind',
			'play'		: 'Play',
			'pause'		: 'Pause',
			'copy'		: 'Copy',
			'e_rewind'	: 'Rewind (Ensemble)',
			'e_play'	: 'Play (Ensemble)',
			'e_pause'	: 'Pause (Ensemble)',
			
			'Lute'		: 'Lute',
			'Ukulele'	: 'Ukulele', 
			'Mandorin'	: 'Mandorin', 
			'Flute'		: 'Flute',
			'Roncadora'	: 'Roncadora',
			'Chalumeau'	: 'Chalumeau',
			'Tuba'		: 'Tuba',
			'Lyre'		: 'Lyre',
			'Snare'		: 'Snare',
			'Drum'		: 'Drum',
			'Bass Drum'	: 'Bass Drum',
			'Cymbal'	: 'Cymbal',
			'Xylophone'	: 'Xylophone'
		},
		ja : {
			'Rank'		: 'ランク',
			'Inst'		: '楽器',
			'Melody'	: 'メロディ',
			'Chord1'	: '和音１',
			'Chord2'	: '和音２',
			
			'rewind'	: '巻き戻し',
			'play'		: '再生',
			'pause'		: '一時停止',
			'copy'		: 'コピー',
			'e_rewind'	: '巻き戻し（合奏）',
			'e_play'	: '再生（合奏）',
			'e_pause'	: '一時停止（合奏）',
			
			'Lute'		: 'リュート',
			'Ukulele'	: 'ウクレレ',
			'Mandorin'	: 'マンドリン',
			'Flute'		: 'フルート',
			'Roncadora'	: 'ロンカドーラ',
			'Chalumeau'	: 'シャリュモー',
			'Tuba'		: 'チューバ',
			'Lyre'		: 'リラ',
			'Snare'		: 'スネア',
			'Drum'		: '小太鼓',
			'Bass Drum'	: '大太鼓',
			'Cymbal'	: 'シンバル',
			'Xylophone'	: 'シロフォン'
		}
	};
	var message = function (str){ return (typeof messages[locale][str] == 'undefined') ? msg['en'][str] : messages[locale][str]; }
	
	var dLength = 96;	// = 1quarternote = 32tick
	var Semibreve = dLength*4;	// 1小節
	var Minim = dLength*2;		// １拍（Tick連動）

	
	var TRACK_START = String.fromCharCode(
		0x4d, 0x54, 0x72, 0x6b
	);
	var TRACK_END   = String.fromCharCode(
		0xFF, 0x2F
	);

	var NOTE_TABLE = {'c':0,'d':2,'e':4,'f':5,'g':7,'a':9,'b':11};

	var GM_RESET = String.fromCharCode(
		0x7E, 0x7F, 0x09, 0x01, 0xF7	// GM Reset F0 7E 7F 09 01 F7
	);
	
	// 楽器セレクタ
	function inst_selecteor(selected_inst){
		var html = '<select class="inst" style="width:100px;">';
		for (var name in insts) {
			html += '<option value="'+insts[name].inst+'" '+((selected_inst == insts[name].inst) ? 'selected' : '')+'>'+name+'</option>';
		}
		html += '</select>'
		return html;
	}
	
	// ランクを取得
	function mml_rank( mml ) {
		var ranks = [
			[ "P", 200, 100, 0 ],
			[ "F", 400, 200, 100 ],
			[ "E", 500, 200, 100 ],
			[ "D", 600, 250, 150 ],
			[ "C", 650, 250, 200 ],
			[ "B", 700, 300, 200 ],
			[ "A", 750, 300, 200 ],
			[ "9", 800, 350, 200 ],
			[ "8", 850, 400, 200 ],
			[ "7", 900, 400, 200 ],
			[ "6", 950, 450, 200 ],
			[ "5", 1000, 500, 250 ],
			[ "4", 1050, 550, 300 ],
			[ "3", 1100, 600, 350 ],
			[ "2", 1150, 700, 400 ],
			[ "1", 1200, 800, 500 ]
		];
		for( var i = 0; i < ranks.length; i++ ){
			var r = ranks[i];
			if (typeof(mml[0]) == 'undefined') mml[0] = '';
			if (typeof(mml[1]) == 'undefined') mml[1] = '';
			if (typeof(mml[2]) == 'undefined') mml[2] = '';
			if( r[1] >= mml[0].length && r[2] >= mml[1].length && r[3] >= mml[2].length ){
				return '<span title="'+message('Melody')+ ': '+mml[0].length + ' / '+message('Chord1')+ ': '+mml[1].length+' / '+message('Chord2')+ ': '+mml[2].length+'">'+message('Rank')+ ': '+r[0]+'</span>';
			}
		}
		return "-";
	}
	// マスタートラック
	function genMasterTrack(){
		var part_msgs = [
			{'time' : 0, 'msg' : String.fromCharCode(0xF0) + GM_RESET + String.fromCharCode(0xF7) },
			{'time' : 96, 'msg' : String.fromCharCode(0xff,0x51, 0x07, 0xa1, 0x20)},	// テンポ設定（デフォルト60000000/120 = 500000）
			{'time' : 368 , 'msg' : String.fromCharCode(0xff , 0x2f, 0x00)}	// Meta TrkEnd
		];
		var track_data = '';
		var last_time;
		for(var mmid = 0; mmid < part_msgs.length; mmid++) {
			var dt = part_msgs[mmid].time - last_time;
			last_time = part_msgs[mmid].time;
			track_data += mml_writeVarLen(dt) + part_msgs[mmid].msg;
		}
		
		var ret = 
			TRACK_START +	// MTrk
			mml_getBytes(track_data.length,4) +// Block Length
			track_data 							// Midi data
			TRACK_END;		// Trk End
		;
		return ret;
	}
	
	
	// トラックごとの処理
	function genTrack(mml, chid, inst, pan, effect, Min, Max){
		var isDrum = (Min == Max) ? true : false;
		var cLength = dLength;
		var cOctave = 4;
		var cVolume = 8;
		var cNote = 0;				// "&"記号処理用
		var tieEnabled = false; 	// "&"記号処理用
		var time = Semibreve;		// 先頭を１小節あける。（ノイズがでるため）
		var isDrum = false;
		if (Min == Max){
			chid = 9;
			isDrum = true;
		}
		
		var part_msgs = [
			{'time' : 96,	'msg' : String.fromCharCode(0xc0 + chid, inst)},	// PrCh 楽器変更
			{'time' : 192,	'msg' : String.fromCharCode(0xb0 + chid, 10, pan)},		// パンポット
			{'time' : 288,	'msg' : String.fromCharCode(0xb0 + chid, 91, effect)}	// エフェクト
		];

		var notes = mml.match(/[A-GLNORTV<>][\+\#-]?[0-9]*\.?&?/ig);

		for(var mnid=0; mnid < notes.length; mnid++) {
			if( notes[mnid].match(/([LOTV<>])([1-9][0-9]*|0?)(\.?)(&?)/i) ) {
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
						cOctave = (cOctave<=1) ? 1: (cOctave-1);
						break;
					case '>':
						cOctave = (cOctave>=8) ? 8: (cOctave+1);
						break;
				}
			}
			
			if( notes[mnid].match(/([A-GN])([\+\#-]?)([0-9]*)(\.?)(&?)/i) ) {
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
							var note = 12*cOctave + NOTE_TABLE[RegExp.$1.toLowerCase()];

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
					while (note < Min) note = note+12;
					while (note > Max) note = note-12;
					note += 12; // 1オクターブ低く演奏される不具合を修正 060426
				}else{
					// ドラムパートの場合ノートを強制的に指定
					note = Max;
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
			}else if(tieEnabled == true) {	// 無効なタイの処理
				tieEnabled = false;
				part_msgs.push({'time':time,'msg':String.fromCharCode(0x80+chid,cNote,Minim)});	// NoteOff
			}
			
			// 休符設定 R[n][.] (n=1～64)
			if(notes[mnid].match(/[rR]([0-9]*)(\.?)/)) {
				tick=cLength; // 数字なし -> Lで指定した長さに設定
				var len = RegExp.$1;
				if(1<=len && len<=Minim) tick=Math.floor(Semibreve/len);	// L1 -> 128tick .. L64 -> 2tick
				if(RegExp.$2==".") tick=Math.floor(tick*1.5);	// 付点つき -> 1.5倍
				time += tick;									// タイムカウンタを休符の長さだけ進める
			}
		}
		part_msgs.push({time:time+Minim , 'msg' : String.fromCharCode(0xff , 0x2f, 0x00)});	// Meta TrkEnd
//		part_msgs.sort(function(a, b) {return a["time"] < b["time"] ? 1 : -1;});
		var track_data = '';
		var last_time;
		for(var mmid = 0; mmid < part_msgs.length; mmid++) {
			var dt = part_msgs[mmid].time - last_time;
			last_time = part_msgs[mmid].time;
			track_data += mml_writeVarLen(dt) + part_msgs[mmid].msg;
		}
		
		var ret = 
			TRACK_START +	// MTrk
			mml_getBytes(track_data.length,4) +// Block Length
			track_data 							// Midi data
			TRACK_END;		// Trk End
		;
		return ret;
	}

	// MML>MIDI変換コアルーチン
	function mabimml_genmidi(param) {
		var nMin = 16, nMax = 88;
		var tracks = 0;
		var ret ='';
		// Master Track
		//ret += genMasterTrack();
		
		// 直下にmmlパラメータが存在するかで、単一楽器用かどうかを判定する
		if (param.mml){
			if (param.min || param.max){
				nMin = param.min;
				nMax = param.max;
			}
			var inst = (param.inst && param.inst >= 0 && param.inst < 128) ? Math.round(param.inst) : 0;
			var pan = (param.pan && param.pan >= 0 && param.pan < 128) ? Math.round(param.pan) : 64;
			var effect = (param.effect && param.effect >= 0 && param.effect < 128) ? Math.round(param.effect) : 40;
			
			if (nMin == nMax){
				// ドラムの場合、メロディ→和音１→和音２という順にMMLが再生される。
				var d_mml = '';
				for(var part = 0; part < param.mml.length; part++) {	// パートごとに処理
					d_mml += param.mml[part];
				}
				ret += genTrack(d_mml, part, inst, pan, effect, nMin, nMax);
			}else{
				for(var part = 0; part < param.mml.length; part++) {	// パートごとに処理
					ret += genTrack(param.mml[part], part, inst, pan, effect, nMin, nMax);
					tracks++;
				}
			}
		}else if (typeof(param) === 'object'){
			// 合奏用
			for (var i = 0; i < param.length; i ++) {	// iの値はパート用番号として流用
				var p = param[i];
				if (p.min || p.max){
					nMin = p.min;
					nMax = p.max;
				}
				var inst = (p.inst && p.inst >= 0 && p.inst < 128) ? Math.round(p.inst) : 0;
				var pan = (p.pan && p.pan >= 0 && p.pan < 128) ? Math.round(p.pan) : 64;
				var effect = (p.effect && p.effect >= 0 && p.effect < 128) ? Math.round(p.effect) : 40;
				
				if (nMin == nMax){
					// ドラムの場合、メロディ→和音１→和音２という順にMMLが再生される。
					var d_mml = '';
					for(var part = 0; part < p.mml.length; part++) {	// パートごとに処理
						d_mml += p.mml[part];
					}
					ret += genTrack(d_mml, part, inst, pan, effect, nMin, nMax);
				}else{
					for(var part = 0; part < p.mml.length; part++) {
						ret += genTrack(p.mml[part], i, inst, pan, effect, nMin, nMax);
						tracks++;
					}
				}
			}
		}
		// ヘッダーとともに内容を返す
		return 'data:audio/midi;base64,'+base64encode(
			String.fromCharCode(
				0x4D, 0x54, 0x68, 0x64,		// chunk ID "MThd"
				0x00, 0x00, 0x00, 0x06,		// chunk size
				0x01, 0x00,					// format type (Midi format1)
				0x00, tracks,				// number of tracks
				0x00, dLength				// ticks per beat
			) + ret
		);
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
		var mml = str.replace(/\r\n|\n\r|\n|\r|\s|/g, '');	// Remove line break and space
		var ret = mml.match(/MML\@([0-9A-GLNORTV#<>.&+-]*),([0-9A-GLNORTV#<>.&+-]*),([0-9A-GLNORTV#<>.&+-]*);/i);
		if (typeof(ret) !=='object'){
			return false;
		}else{
			ret.shift();	// 一番先頭の配列は削除
			return ret;
		}
	}

	// BASE64 (RFC2045) Encode/Decode for string in JavaScript
	// Version 1.2 Apr. 8 2004 written by MIZUTANI Tociyuki
	// Copyright 2003-2004 MIZUTANI Tociyuki
	// http://tociyuki.cool.ne.jp/archive/base64.html
	function base64encode(s){
		try{
			// Browser native function
			return btoa(s);
		}catch(e){
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
	
	function mml_player(url, ensemble){
		return [
			'<object type="audio/midi" width="1" height="1"' +
					( ensemble ? 'data-group="'+ensemble+'" ' : ''),
					( isMSIE ? 'classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" codebase="http://www.apple.com/qtactivex/qtplugin.cab"' : 'data="'+url+'"' ) + '>',
				'<param name="controller" value="false" />',
				'<param name="src" value="'+url+'" />',
				'<param name="autoplay" value="false" />',
				'<param name="pluginspage" value="http://www.apple.com/quicktime/download/" />',
			'</object>'
		].join("\n");
	}

	function mml_genplayer(dom, count){
		var self = dom;
		var $this = $(dom);
		var data = $this.data();
		var param = {};

		if (data.instName !== '' && insts[data.instName] ){
			param = {
				inst : insts[data.instName].inst,
				max  : insts[data.instName].max,
				min  : insts[data.instName].min
			};
		}else if (data.inst !== ''){
			for (var name in insts) {
				if (insts[name].inst = data.inst){
					param = {
						inst : insts[name].inst,
						max  : insts[name].max,
						min  : insts[name].min
					};
					break;
				}
			}
		}
		
		var mml = mml_sanitize($this.contents()[0].nodeValue);	// MML配列
		if (mml === false){
			return '<p class="alert alert-error">Could not parse MML. Invalied format?</p>';
		}else{
			param.group  = data.group  ? data.group : 0;
			param.debug  = data.debug  ? true : false;
			param.pan    = data.pan    ? data.pan : 64;
			param.effect = data.effect ? data.effect : 40;
			param.mml    = mml;
			param.id     = count;

			return mml_widget(param);
		}
	}


	$(document).ready(function(){
		var count = 0;
		var ensemble_params = {};
		$("head").append('<link rel="stylesheet" href="http://logue.github.com/PSGConverter/css/PSGConverter.min.css" />');

		if (isMSIE){
			// MSIEはChrome Frameで逃げる
			$.getScript('http://ajax.googleapis.com/ajax/libs/chrome-frame/1/CFInstall.min.js',function(){
				CFInstall.check({
					mode: 'overlay'
				});
			});
		}
		
		$('.mabimml').each(function(){
			var $this = $(this);
			var data = $this.data();
			var param = {};
			
			var mml = mml_sanitize($this.contents()[0].nodeValue);	// MML配列
			if (mml === false){
				$this.before('<p class="alert alert-error">Could not parse MML. Invalied format?</p>');
			}else{
				if (data.instName !== '' && insts[data.instName] ){
					param = {
						inst_name : data.instName,
						inst : insts[data.instName].inst,
						max  : insts[data.instName].max,
						min  : insts[data.instName].min
					};
				}else if (data.inst !== ''){
					for (var name in insts) {
						if (insts[name].inst = data.inst){
							param = {
								inst_name : name,
								inst : insts[name].inst,
								max  : insts[name].max,
								min  : insts[name].min
							};
							break;
						}
					}
				}
				param.group  = data.group  ? data.group : 0;
				param.debug  = data.debug  ? true : false;
				param.pan    = data.pan    ? data.pan : 64;
				param.effect = data.effect ? data.effect : 40;
				param.mml    = mml;
				param.id     = count;
				
				var mml_url = (!isMSIE) ? mabimml_genmidi(param) : 
					'http://comp.mabinogi.jp/PSGConverter.exe? /i'+param.inst+ ' ' + encodeURIComponent(param.mml[0]+','+param.mml[1]+','+param.mml[2]);
				
				var tag = $this.attr('title') ? 'fieldset' : 'div';
				
				// MMLの書かれているタグを外からmml-playerクラスでくくる
				$this.wrapAll([
					'<'+tag+' class="mml-player" '+(param.group !==0 ? 'data-group="'+param.group +'" ' : '')+'>',
						($this.attr('title') ?
							'<legend>'+$this.attr('title')+' <span class="label">'+mml_rank(mml)+'</span>  <span class="label label-info">'+message('Inst')+ ': '+message(param.inst_name)+'</span></legend>' :
							'<span class="label">'+mml_rank(mml)+'</span>  <span class="label label-info">'+message('Inst')+ ': '+ message(param.inst_name) + '</span>'
						),
						(param.debug ? '<legend class="mml-debug btn btn-small btn-warning" href="'+url+'">debug.mid</a>' : ''),
						'<button class="mml-rewind btn btn-mini">'+message('rewind')+ '</button>',
						'<button class="mml-play btn btn-mini btn-primary">'+message('play')+ '</button>',
						'<button class="mml-pause btn btn-mini btn-danger" style="display:none;">'+message('pause')+ '</button>',
						'<button class="mml-copy btn btn-mini btn-info" id="__mmlcopy'+param.id+'" data-str="'+('MML@'+param.mml[0]+','+param.mml[1]+','+param.mml[2]+';')+'">'+message('copy')+ '</button>',
						mml_player(mml_url),
					'</'+tag+'>'
				].join("\n"));

				// 外からくくっているため、イベント割り当て処理が煩雑に
				var $self = $this.parent();
				var obj = $self.children('object')[0];
				var $play = $self.children('.mml-play');
				var $stop = $self.children('.mml-pause');

				$self.children('.mml-rewind',this).click(function(){
					obj.Rewind();
				});
				$play.click(function(){
					obj.Play();
					$(this).css({'display':'none'});
					$stop.css({'display':'inline-block'});
				});
				$stop.click(function(){
					obj.Stop();
					$(this).css({'display':'none'});
					$play.css({'display':'inline-block'});
				});
				
				// 合奏用にMMLをキャッシュ
				if (param.group){
					try{
						ensemble_params[param.group].push(param);
					}catch(e){
						ensemble_params[param.group] = [];
						ensemble_params[param.group].push(param);
					}
				}
			}
			count++;
		});
		
		if (!isMSIE){
			// キャッシュされたMML合奏用プレイヤーの作成
			for (var group in ensemble_params) {
				$('body').append(mml_player(mabimml_genmidi(ensemble_params[group]),group));
				var obj = $('object[data-group='+group+']')[0];
				$('.mml-player[data-group='+group+']').each(function(){
					var $this = $('.mml-copy',this);
					$this.after(
						'<button class="mml-ensumble-rewind btn btn-mini">'+message('e_rewind')+ '</button>' +
						'<button class="mml-ensumble-play btn btn-mini btn-success">'+message('e_play')+ '</button>' +
						'<button class="mml-ensumble-pause btn btn-mini btn-danger" style="display:none;">'+message('e_pause')+ '</button>'
					);
				});
				var $play = $('*[data-group='+group+'] .mml-ensumble-play');
				var $stop = $('*[data-group='+group+'] .mml-ensumble-pause');
				var $rewind = $('*[data-group='+group+'] .mml-ensumble-rewind');

				$rewind.click(function(){
					obj.Rewind();
				});
				$play.click(function(){
					obj.Play();
					$play.css({'display':'none'});
					$stop.css({'display':'inline-block'});
				});
				$stop.click(function(){
					obj.Stop();
					$stop.css({'display':'none'});
					$play.css({'display':'inline-block'});
				});
			}
		}

		if (location.protocol !== 'file:'){
			$.getScript('http://logue.github.com/PSGConverter/js/ZeroClipboard/ZeroClipboard.js',function(){
				ZeroClipboard.setMoviePath('http://logue.github.com/PSGConverter/js/ZeroClipboard/ZeroClipboard.swf');
				$('.mml-copy').each(function(){
					var $this = $(this);
					$this.css({'display':'inline-block'});
					var clip = new ZeroClipboard.Client();
					clip.setText($this.attr('data-str'));
					clip.glue($this.attr('id'));
				});
			});
		}
	});
} )(jQuery, this, this.document );