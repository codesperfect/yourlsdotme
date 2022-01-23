function copyToClipboard(text) {
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val(text).select();
  document.execCommand("copy");
  $temp.remove();
}

$('#copybutton').click(function () { 
copyToClipboard("<%=url%>");
$("#result").html('copied successfully!');
setTimeout(function(){
  $("#result").html('');
},3000);
});
