function currentTime() {
    let date = new Date()

    let day   = date.getDate()
    let month = date.getMonth() +1
    let year  = date.getFullYear()


    let hh = date.getHours()
    let mm = date.getMinutes()
    let ss = date.getSeconds()
    let session = "AM";
  
    if(hh === 0){
        hh = 12;
    }
    if(hh > 12){
        hh = hh - 12;
        session = "PM";
     }
  
     hh = (hh < 10) ? "0" + hh : hh;
     mm = (mm < 10) ? "0" + mm : mm;
     ss = (ss < 10) ? "0" + ss : ss;
    
     let time = hh + ":" + mm + ":" + ss + " " + session;
     let time_unix = Date.now()
     let time_date = day + '/' + month + '/' + year 

  
    document.getElementById("clock").innerText = 'Date: ' + time_date 
    + '\nTime: ' + time
    + '\nUNIX:' + time_unix; 
    let t = setTimeout(function(){ currentTime() }, 100);
}

function MJD() {
//   let mjd = 
//    document.getElementById('MJDclock').innerText = 'MJD: '+ mjd
//}
}

currentTime();
