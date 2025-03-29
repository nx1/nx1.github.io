function currentTime() {
    let date = new Date()

    let day   = date.getDate()
    let month = date.getMonth() + 1
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
     let mjd = MJD(date);
     let age = Age(date);
     let tz  = Intl.DateTimeFormat().resolvedOptions().timeZone;

     document.getElementById("clock").innerText = 'Date : ' + time_date 
     + '\nTime : ' + time
     + '\nUNIX : ' + time_unix
     + '\nMJD  : ' + mjd
     + '\nAge  : ' + age
     + '\nTZ   : ' + tz;
     let t = setTimeout(function(){ currentTime() }, 1000);
}

function MJD(date) {
    let jd = date.valueOf() / 86400000 + 2440587.5;
    let mjd = jd - 2400000.5;
    return mjd.toFixed(5);
}

function Age(date){
    let birth_date = new Date('1996-03-17T06:00:00.000Z');
    let diff = date - birth_date;
    let years = diff / (365.25*24*60*60*1000)
    return '' + years.toFixed(6)
}

currentTime();
