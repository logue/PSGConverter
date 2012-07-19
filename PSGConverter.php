<?php
/**
@prefix : <http://purl.org/net/ns/doas#> .
<> a :PHP Script;
 :shortdesc "Mabinogi MML to MIDI Convertion Script";
 :created "2006-04-26";
 :release [:revision "2.1"; :created "2009-08-08"];
 :author [:name "Tamanegi"; :homepage <http://www.annie.ne.jp/~tamanegi/> ];
 :modifider[:name"Logue"; :homepage <http://logue.be/> ];
 :license <http://creativecommons.org/licenses/GPL/2.0/>;
 :dependencies "none";
 :infomation <http://mabiassist.logue.be/PSGConverter>;
*/

/* Infomation : 
/****************************************************************************
Software: Midi Class
Version:  1.7.5
Date:     2009/06/24
Author:   Valentin Schmidt
Contact:  fluxus@freenet.de
License:  Freeware

You may use and modify this software as you wish.

Last Changes:
        + downloadMidFile: order of params swapped, so $file can be omitted to 
          directly start downloading file from memory without using a temp file
        
				- some fixes by Michael Mlivoncic (MM):
				+ PrCh added as shortened form (repetition)
				+ exception-handling for PHP 5: raise exception on corrupt MIDI-files
				+ download now sends gzip-Encoded (if supported  by browser)
				+ parser correctly reads field-length > 127 (several event types)
				+ fixed problem with fopen ("rb")
				+ PitchBend: correct values (writing back negative nums lead to corrupt files)
				+ parser now accepts unknown meta-events

****************************************************************************/

class Midi{

//Private properties
var $tracks;          //array of tracks, where each track is array of message strings
var $timebase;        //timebase = ticks per frame (quarter note)
//var $tempo;           //tempo as integer (0 for unknown)
var $tempoMsgNum;     //position of tempo event in track 0
var $type;


/****************************************************************************
*                                                                           *
*                              Public methods                               *
*                                                                           *
****************************************************************************/

//---------------------------------------------------------------
// creates (or resets to) new empty MIDI song
//---------------------------------------------------------------
function open($timebase=480){
//	$this->tempo = 0;//125000 = 120 bpm
	$this->timebase = $timebase;
	$this->tracks = array();
}

//---------------------------------------------------------------
// import whole MIDI song as text (mf2t-format)
//---------------------------------------------------------------
function importTxt($txt){
	$txt = trim($txt);
	// make unix text format
	if (strpos($txt,"\r")!==false && strpos($txt,"\n")===false) // MAC
		$txt = str_replace("\r","\n",$txt);
	else // PC?
		$txt = str_replace("\r",'',$txt);
	$txt = $txt."\n";// makes things easier

	$headerStr = strtok($txt,"\n");
	$header = explode(' ',$headerStr); //"MFile $type $tc $timebase";
	$this->type = $header[1];
	$this->timebase = $header[3];
	$this->tempo = 0;

	$trackStrings = explode("MTrk\n",$txt);
	array_shift($trackStrings);
	$tracks = array();
	foreach ($trackStrings as $trackStr){
		$track = explode("\n",$trackStr);
		array_pop($track);
		array_pop($track);
/*
		if ($track[0]=="TimestampType=Delta"){//delta
			array_shift($track);
			$track = _delta2Absolute($track);
		}
*/
		$tracks[] = $track;
	}
	$this->tracks = $tracks;
//	$this->_findTempo();
}

//---------------------------------------------------------------
// returns binary MIDI string
//---------------------------------------------------------------
function getMid(){
	$tracks = $this->tracks;
	$tc = count($tracks);
	$type = ($tc > 1)?1:0;
	$midStr = "MThd\0\0\0\6\0".chr($type)._getBytes($tc,2)._getBytes($this->timebase,2);
	for ($i=0;$i<$tc;$i++){
		$track = $tracks[$i];
		$mc = count($track);
		$time = 0;
		$midStr .= "MTrk";
		$trackStart = strlen($midStr);

		$last = '';

		for ($j=0;$j<$mc;$j++){
			$line = $track[$j];
			$t = $this->_getTime($line);
			$dt = $t - $time;
			$time = $t;
			$midStr .= _writeVarLen($dt);

			// repetition, same event, same channel, omit first byte (smaller file size)
			$str = $this->_getMsgStr($line);
			$start = ord($str[0]);
			if ($start>=0x80 && $start<=0xEF && $start==$last) $str = substr($str, 1);
			$last = $start;

			$midStr .= $str;
		}
		$trackLen = strlen($midStr) - $trackStart;
		$midStr = substr($midStr,0,$trackStart)._getBytes($trackLen,4).substr($midStr,$trackStart);
	}
	return $midStr;
}

//---------------------------------------------------------------
// starts download of Standard MIDI File, either from memory or from the server's filesystem	'
// ATTENTION: order of params swapped, so $file can be omitted to directly start download
//---------------------------------------------------------------
function downloadMidFile($output, $file=false){
//	ob_start("ob_gzhandler"); // for compressed output...
	
	$mime_type = 'audio/midi';
	//$mime_type = 'application/octetstream'; // force download

	header('Content-Type: '.$mime_type);
	header('Expires: '.gmdate('D, d M Y H:i:s').' GMT');
	header('Content-Disposition: attachment; filename="'.$output.'"');
	header('Pragma: no-cache');
	
	if ($file){
		$d=fopen($file,"rb");
		fpassthru($d);
		@fclose($d);
	}else
		echo $this->getMid();
	exit();
}


/****************************************************************************
*                                                                           *
*                              Private methods                              *
*                                                                           *
****************************************************************************/

//---------------------------------------------------------------
// returns time code of message string
//---------------------------------------------------------------
function _getTime($msgStr){
	return (int) strtok($msgStr,' ');
}

//---------------------------------------------------------------
// returns binary code for message string
//---------------------------------------------------------------
function _getMsgStr($line){
	$msg = explode(' ',$line);
	switch($msg[1]){
		case 'PrCh': // 0x0C
			eval("\$".$msg[2].';'); // chan
			eval("\$".$msg[3].';'); // prog
			return chr(0xC0+$ch-1).chr($p);
			break;
		case 'On': // 0x09
			eval("\$".$msg[2].';'); // chan
			eval("\$".$msg[3].';'); // note
			eval("\$".$msg[4].';'); // vel
			return chr(0x90+$ch-1).chr($n).chr($v);
			break;
		case 'Off': // 0x08
			eval("\$".$msg[2].';'); // chan
			eval("\$".$msg[3].';'); // note
			eval("\$".$msg[4].';'); // vel
			return chr(0x80+$ch-1).chr($n).chr($v);
			break;
		case 'PoPr': // 0x0A = PolyPressure
			eval("\$".$msg[2].';'); // chan
			eval("\$".$msg[3].';'); // note
			eval("\$".$msg[4].';'); // val
			return chr(0xA0+$ch-1).chr($n).chr($v);
			break;
		case 'Par': // 0x0B = ControllerChange
			eval("\$".$msg[2].';'); // chan
			eval("\$".$msg[3].';'); // controller
			eval("\$".$msg[4].';'); // val
			return chr(0xB0+$ch-1).chr($c).chr($v);
			break;
		case 'ChPr': // 0x0D = ChannelPressure
			eval("\$".$msg[2].';'); // chan
			eval("\$".$msg[3].';'); // val
			return chr(0xD0+$ch-1).chr($v);
			break;
		case 'Pb': // 0x0E = PitchBend
			eval("\$".$msg[2].';'); // chan
			eval("\$".$msg[3].';'); // val (2 Bytes!)
			$a = $v & 0x7f; // Bits 0..6
			$b = ($v >> 7) & 0x7f; // Bits 7..13
			return chr(0xE0+$ch-1).chr($a).chr($b);
			break;
		// META EVENTS
		case 'Seqnr': // 0x00 = sequence_number
			$num = chr($msg[2]);
			if ($msg[2]>255) _err("code broken around Seqnr event");
			return "\xFF\x00\x02\x00$num";
			break;
		case 'Meta':
			$type = $msg[2];
			switch ($type){
				case 'Text': //0x01: // Meta Text
				case 'Copyright': //0x02: // Meta Copyright
				case 'TrkName': //0x03: // Meta TrackName ???SeqName???
				case 'InstrName': //0x04: // Meta InstrumentName
				case 'Lyric': //0x05: // Meta Lyrics
				case 'Marker': //0x06: // Meta Marker
				case 'Cue': //0x07: // Meta Cue
					$texttypes = array('Text','Copyright','TrkName','InstrName','Lyric','Marker','Cue');
					$byte = chr(array_search($type,$texttypes)+1);
					$start = strpos($line,'"')+1;
					$end = strrpos($line,'"');
					$txt = substr($line,$start,$end-$start);
// MM: Todo: Len could also be more than one Byte (variable length; see. "Sequence/Track name specification)
					$len = chr(strlen($txt));
					if ($len>127) _err("code broken (write varLen-Meta)");
					return "\xFF$byte$len$txt";
					break;
				case 'TrkEnd': //0x2F
					return "\xFF\x2F\x00";
					break;
				case '0x20': // 0x20 = ChannelPrefix
					$v = chr($msg[3]);
					return "\xFF\x20\x01$v";
					break;
				case '0x21': // 0x21 = ChannelPrefixOrPort
					$v = chr($msg[3]);
					return "\xFF\x21\x01$v";
					break;
				default:
					_err("unknown meta event: $type");
					exit();
			}
			break;
		case 'Tempo': // 0x51
			$tempo = _getBytes((int)$msg[2],3);
			return "\xFF\x51\x03$tempo";
			break;
		case 'SMPTE': // 0x54 = SMPTE offset
			$h = chr($msg[2]);
			$m = chr($msg[3]);
			$s = chr($msg[4]);
			$f = chr($msg[5]);
			$fh = chr($msg[6]);
			return "\xFF\x54\x05$h$m$s$f$fh";
			break;
		case 'TimeSig': // 0x58
			$zt = explode('/',$msg[2]);
			$z = chr($zt[0]);
			$t = chr(log($zt[1])/log(2));
			$mc = chr($msg[3]);
			$c = chr($msg[4]);
			return "\xFF\x58\x04$z$t$mc$c";
			break;
		case 'KeySig': // 0x59
			$vz = chr($msg[2]);
			$g = chr(($msg[3]=='major')?0:1);
			return "\xFF\x59\x02$vz$g";
			break;
		case 'SeqSpec': // 0x7F = Sequencer specific data (Bs: 0 SeqSpec 00 00 41)
			$cnt = count($msg)-2;
			$data = '';
			for ($i=0;$i<$cnt;$i++)
				$data.=_hex2bin($msg[$i+2]);
// MM: ToDo: Len >127 has to be variable length-encoded !!!
			$len = chr(strlen($data));
			if ($len>127) _err('code broken (write varLen-Meta)');
			return "\xFF\x7F$len$data";
			break;
		case 'SysEx': // 0xF0 = SysEx
			$start = strpos($line,'f0');
			$end = strrpos($line,'f7');
			$data = substr($line,$start+3,$end-$start-1);
			$data = _hex2bin(str_replace(' ','',$data));
			$len = chr(strlen($data));
			return "\xF0$len".$data;
			break;

		default:
			_err('unknown event: '.$msg[1]);
			exit();
	}
}

} // END OF CLASS

//***************************************************************
// UTILITIES
//***************************************************************

//---------------------------------------------------------------
// hexstr to binstr
//---------------------------------------------------------------
function _hex2bin($hex_str) {
	$bin_str='';
  for ($i = 0; $i < strlen($hex_str); $i += 2) {
	$bin_str .= chr(hexdec(substr($hex_str, $i, 2)));
  }
  return $bin_str;
}

//---------------------------------------------------------------
// int to bytes (length $len)
//---------------------------------------------------------------
function _getBytes($n,$len){
	$str='';
	for ($i=$len-1;$i>=0;$i--){
		$str.=chr(floor($n/pow(256,$i)));
	}
	return $str;
}

//---------------------------------------------------------------
// int to variable length string
//---------------------------------------------------------------
function _writeVarLen($value){
	$buf = $value & 0x7F;
	$str='';
	while (($value >>= 7)){
	  $buf <<= 8;
	  $buf |= (($value & 0x7F) | 0x80);
	}
	while (TRUE){
		$str.=chr($buf%256);
		if ($buf & 0x80) $buf >>= 8;
		else break;
	}
	return $str;
}

//---------------------------------------------------------------
// error message
//---------------------------------------------------------------
function _err($str){
	if ((int)phpversion()>=5)
	eval('throw new Exception($str);'); // throws php5-exceptions. the main script can deal with these errors.
	else
		die('>>> '.$str.'!');
}

// end midi.class.php


// メイン

$debug =0;

if (! isset($_GET['m'])) {
	// 音色番号→$inst
	$inst   = (isset($_GET['i'])) ? (int)$_GET['i'] : 1;	// 楽器設定
	$isDrum = (isset($_GET['d'])) ? (int)$_GET['d'] : 0;	// ドラムパートか？
	$ch     = (isset($_GET['c'])) ? (int)$_GET['c'] : (($isDrum !== 0) ? 10 : 1);		// 使用チャンネル（ドラムだった場合は、10にする）
	if(($inst<1) || (128<$inst)) $inst=1;	// 楽器の範囲は、1~128
	// 2.1 Add
	$Hlimit = (isset($_GET['h'])) ? (int)$_GET['h'] : 88;	// 音階の最高値
	$Llimit = (isset($_GET['l'])) ? (int)$_GET['l'] : 16;	// 音階の最低値
}else{
	// プリセットの楽器番号を使う（0は無効。楽器設定などのパラメータは無視されます。3MLE互換）
	switch ($_GET['m']){
		case 1:	// リュート
			$inst = 24;
			$Hlimit = 88;
			$Llimit = 16;
		break;
		case 2:	// ウクレレ
			$inst = 28;
			$Hlimit = 88;
			$Llimit = 16;
		break;
		case 3:	// マンドリン
			$inst = 105;
			$Hlimit = 88;
			$Llimit = 16;
		break;
		case 4:	// ホイッスル
			$inst = 79;
			$Hlimit = 88;
			$Llimit = 60;
		break;
		case 5:	// ロンカドーラ
			$inst = 77;
			$Hlimit = 83;
			$Llimit = 48;
		break;
		case 6:	// フルート
			$inst = 73;
			$Hlimit = 83;
			$Llimit = 48;
		break;
		case 7: // シャリュモー
			$inst = 111;
			$Hlimit = 59;
			$Llimit = 24;
		break;
		case 19: // チューバ
			$inst = 58;
			$Hlimit = 59;
			$Llimit = 24;
		break;
		case 20:	// リラ
			$inst = 46;
		case 66:	// スネア
			$inst = 48;
			$isDrum = 38;
		break;
		case 67:	// 小太鼓
			$inst = 48;
			$isDrum = 40;
		break;
		case 68:	// 大太鼓
			$inst = 48;
			$isDrum = 36;
		break;
		case 78:	// シロフォン
			$inst = 14;
		break;
	}
}

$effect = (isset($_GET['e'])) ? (int)$_GET['e'] : 40;	// エフェクトの量
$pan    = (isset($_GET['p'])) ? (int)$_GET['p'] : 64;	// パンポッド

if(isset($_GET['s'])) { 
	$mml = rawurldecode($_GET['s']);
}else {
	header('Content-Type: text/plain');
	die("PSGConverter.php v2.0 Usage:\nPSGConverter.php?\n\ti=(instrumental id | default = 1 Piano)\n\t&s=(encoded mml data)\n\t[\n\t\t&p=(panpot | default=64)\n\t\t&c=(ch | defalut=1)\n\t\t&e=(effect value | default=40)\n\t\t&d=(Drum part note)\n\t\t&h=note high limit\n\t\t&l=note low limit\n\t]");
}
// 譜面データ→$mml_string[3]

// 環境設定用初期値の定義

$track = 1;
// MIDIメッセージテキストの作成
$midiText = array();
// MMLをパース。
preg_match('/(MML@)\s*([\s0-9a-glnortvA-GLNORTV#<>.&+-]*),\s*([\s0-9a-glnortvA-GLNORTV#<>.&+-]*),\s*([\s0-9a-glnortvA-GLNORTV#<>.&+-]*);/',$mml,$matches);
if ($matches && $matches[1] == "MML@"){
	if($matches[2] != ''){ 
		$midiText[] = 'MTrk';
		$midiText[] = '0 Meta Text "Generated by Lolerei(http://mabinogi.logue.be/)"';
		$midiText[] = '0 Tempo 500000'; // テンポ設定（デフォルト60000000/120 = 500000）
		// SysExコマンドでGMリセット
		$midiText[] = '0 SysEx f0 f0 7e 7f 09 01 f7';
		$midiText[] = '192 PrCh ch='.$ch.' p='.$inst; // 音色初期化
		$midiText[] = '193 Par ch=' .$ch.' c=10 v='.$pan; // パンポット
		$midiText[] = '194 Par ch=' .$ch.' c=91 v='.$effect; // リバーブエフェクト
		$midiText[] = PSGConverter($matches[2],$ch,$isDrum,'95','12');
		$midiText[] = 'TrkEnd';
		$track++;
	}
	if($matches[3] != ''){
		$midiText[] = 'MTrk';
		$midiText[] = '192 PrCh ch='.$ch.' p='.$inst; // 音色初期化
		$midiText[] = '193 Par ch=' .$ch.' c=10 v='.$pan; // パンポット
		$midiText[] = '194 Par ch=' .$ch.' c=91 v='.$effect; // リバーブエフェクト
		$midiText[] = PSGConverter($matches[3],$ch,$isDrum,'95','12');
		$midiText[] = 'TrkEnd';
		$track++;
	}
	if($matches[4] != ''){
		$midiText[] = 'MTrk';
		$midiText[] = '192 PrCh ch='.$ch.' p='.$inst; // 音色初期化
		$midiText[] = '193 Par ch=' .$ch.' c=10 v='.$pan; // パンポット
		$midiText[] = '194 Par ch=' .$ch.' c=91 v='.$effect; // リバーブエフェクト
		$midiText[] = PSGConverter($matches[4],$ch,$isDrum,'95','12');
		$midiText[] = 'TrkEnd';
	}
}else{
	die('PSGConverter.php v2.0 Error: Unknown MML format. Please contact to admin.');
}

// ヘッダーを定義
$output = array();
$output = 'MFile 1 '.$track.' 96'. "\n" . join("\n",$midiText);	// 楽譜データーをマージ
$midi=new Midi;
$midi->open();
$midi->importTxt($output); // MIDIメッセージテキスト読み込み

// MIDIクラスへのデータ読み込み・SMFファイルの作成
if ($debug == 1){
	header('Content-Type: text/plain');
	echo $output;
// MIDIデータ用クラスをオープン
}else{
	$buffer = $midi->getMid();
	header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
	header('Content-Type: audio/midi');
	header('Content-Disposition: attachment; filename="PSGConverter.midi"');
	header('Content-Length: '.strlen($buffer));
	echo $buffer;
}
// メインここまで

/* PSGConverter本体　MML→MIDIテキスト */
function PSGConverter($mml,$ch,$isDrum,$max,$min){
	$mml = preg_replace('/\r|\n/','',$mml);
	// 命令の取得
	// $mmlを命令単位に分解して格納する

	// 1命令のデータ構造は
	//	([abcdefglnortvABCDEFGLNORTV<>]) 発音、環境設定
	//	([\+\#-]?) 調号
	//	([0-9]*) 入力値
	//	([\.]?) 補助記号
	//	(&?) 発音の延長
	// からなる。
	
	// 作業用変数の定義・初期化
	// 四分音符を96tickとする。2008/04/17のパッチ対応
	$cLength = 96; // = 1quarternote = 32tick
	$cOctave = 4;
	$cVolume = 8;
	$cNote = 0;			// "&"記号処理用
	$tieEnabled = 0; // "&"記号処理用


	$semibreve = $cLength*4;	// 1小節
	$minim = $cLength*2;	// １泊（Tick連動）
	$time = $semibreve;	// 先頭を１小節あける。

	preg_match_all('/[a-glnortvA-GLNORTV<>][\+\#-]?[0-9]*\.?&?/',$mml,$matches); // 入力されたMMLを命令単位で分割

	foreach($matches[0] as $mml_note) { // 1命令→メッセージ変換
		if (preg_match('/([lotvLOTV<>])([1-9][0-9]*|0?)(\.?)(&?)/',$mml_note,$RegExp)){
			//            $RegExp[1]    $RegExp[2]   $RegExp[3]
			//            コマンド名    値           オプション（タイや付点など）
			// ↑こんな風に代入される。

			$value = (int)$RegExp[2];	//値
			switch ($RegExp[1]){
				// 音長設定 Ln[.] (n=1～192)
				case 'l': case 'L':
					if((1<=$value) && ($value<=$minim)) {
						$cLength=floor($semibreve/$value);	// L1 -> 384tick .. L64 -> 6tick
						if($RegExp[3]==".") $cLength=floor($cLength*1.5); // 付点つき -> 1.5倍
						if($RegExp[4]=='&') $tieEnabled = 1;
					}
				break;

				// オクターブ設定 On (n=1～8)
				case 'O': case 'o':
					if ($isDrum == 0) $cOctave = $value;
				break;

				// テンポ設定 Tn (n=32～255)
				case 'T': case 't':
					if( $value >= 32 && $value <= 255) {
						if ($value == 50){
							$cTempo = 1200000;	// テンポが50のときバグるので、決め打ち
						}else{
							$cTempo = floor(60000000 / $value);	// BPM -> microsec/quarternote
						}
						$TrackText[] = $time.' Tempo '.$cTempo; // テンポ設定
					}
				break;

				// ボリューム設定 Vn (n=0～15)
				case 'v': case 'V':
					if(0<=$value && $value<=15) $cVolume = $value; // ボリューム設定
				break;

				// 簡易オクターブ設定 {<>}
				case '<' :
					$cOctave=($cOctave<=1) ? 1 : ($cOctave-1);
				break;
				case '>' :
					$cOctave=($cOctave>=8) ? 8 : ($cOctave+1);
				break;

				// コメントアウトされていたら以降を処理しない（まきまびしーくに準ずる）
				case '//' :
					exit;
				break;
			}
			unset($RegExp);
		}

		// 音符設定 {ABCDEFG}[+#-][n][.][&] , Nn (n=1～64)
		if (preg_match('/([a-gnA-GN])([\+\#-]?)([0-9]*)(\.?)(&?)/',$mml_note,$RegExp)){
			$tick = $cLength; 
			$value = (int)$RegExp[3];
			switch ($RegExp[1]){
				case 'n': case 'N':
					// Nn, [A-G]数字なし -> Lで指定した長さに設定
					if((12<=$value) && ($value<=95)) $note=$value;
				break;
				default:
					// [A-G] 音名表記
					// 音符の長さ指定: n分音符→128分音符×tick数
					if(1<=$value && $value<=$minim) $tick=floor($semibreve / $value);	// L1 -> 384tick .. L64 -> 6tick
					if($RegExp[4]==".") $tick=floor($tick*1.5); // 付点つき -> 1.5倍

					if ($isDrum == 0){
						// 音名→音階番号変換(C1 -> 12, C4 -> 48, ..)
						$note = (12 * $cOctave) + array_search(strtolower($RegExp[1]),array('c',2=>'d',4=>'e','f',7=>'g',9=>'a',11=>'b'));

						// 調音記号の処理
						switch($RegExp[2]){
							case '+':
							case '#':
								$note++;
							break;
							case '-':
								$note--;
							break;
						}
					}
				break;
			}

			if ($isDrum == 0){
				// オクターブ調整（楽器の音域エミュレーション）
				while ($note < $min) $note = $note+12;
				while ($note > $max) $note = $note-12;
				$note += 12; // 1オクターブ低く演奏される不具合を修正 060426
			}else{
				// ドラムパートの場合ノートを強制的に指定
				$note = $isDrum;
			}

			// ノートオン命令の追加
			if($tieEnabled == 1 && $note != $cNote) { // c&dなど無効なタイの処理
				$tieEnabled=0;
				$TrackText[] = $time.' Off ch='.$ch.' n='.$cNote.' v=100'; // 直前の音をOff
			}

			// 前回タイ記号が無いときのみノートオン
			if($tieEnabled == 0) $TrackText[] = $time.' On ch='.$ch.' n='.$note.' v='.(8*$cVolume);

			$time += $tick;				// タイムカウンタを音符の長さだけ進める

			// ノートオフ命令の追加
			if($RegExp[5]=='&') {	// タイ記号の処理
				$tieEnabled=1; 
				$cNote=$note; // 直前の音階を保存
			} else {
				$tieEnabled=0;
				$TrackText[] = $time.' Off ch='.$ch.' n='.$note.' v=100';
			}

		}else if($tieEnabled==1) {	// 無効なタイの処理
			$tieEnabled=0;
			$TrackText[] = $time.' Off ch='.$ch.' n='.$cNote.' v=100';	// 直前の音をOff
		}

		// 休符設定 R[n][.] (n=1～64)
		if (preg_match('/[rR]([0-9]*)(\.?)/',$mml_note,$RegExp)){
			$tick=$cLength; // 数字なし -> Lで指定した長さに設定
			$l=(int)$RegExp[1];
			if(1<=$l && $l<=$minim) $tick=floor($semibreve/$l);	// L1 -> 128tick .. L64 -> 2tick
			if($RegExp[2]==".") $tick=floor($tick*1.5);	// 付点つき -> 1.5倍
			$time += $tick;								// タイムカウンタを休符の長さだけ進める
		}

		unset ($RegExp);	// メモリ解放

	} // foreach // 1命令→メッセージ変換ここまで

	$time += $cLength; // 曲の最後に4分休符を挿入(Nexon仕様)

	// トラック終了命令
	$TrackText[] = $time.' Meta TrkEnd';
	return join("\n",$TrackText);
}
?>