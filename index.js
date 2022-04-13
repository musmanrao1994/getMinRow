let totalFileNamesLen = 0;



var datass = '';
var DataArr = [];
PDFJS.workerSrc = '';

function ExtractText() {
    var files = document.getElementById("file-id").files;
    totalFileNamesLen = files.length;
    console.log(`totalFileNamesLen =>>`, totalFileNamesLen);

    function readAndPreview(file) {
        var fReader = new FileReader();
        fReader.readAsDataURL(file);

        // console.log(input.files[0]);
        fReader.onloadend = function (event) {
            convertDataURIToBinary(event.target.result);
        }
    }

    if (files) {
        [].forEach.call(files, readAndPreview);
    }

    document.getElementById("file-id").value = null

}

var BASE64_MARKER = ';base64,';

function convertDataURIToBinary(dataURI) {

    var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    var base64 = dataURI.substring(base64Index);
    var raw = window.atob(base64);
    var rawLength = raw.length;
    var array = new Uint8Array(new ArrayBuffer(rawLength));

    for (var i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    pdfAsArray(array)

}

function getPageText(pageNum, PDFDocumentInstance) {
    // Return a Promise that is solved once the text of the page is retrieven
    return new Promise(function (resolve, reject) {
        PDFDocumentInstance.getPage(pageNum).then(function (pdfPage) {
            // The main trick to obtain the text of the PDF page, use the getTextContent method
            pdfPage.getTextContent().then(function (textContent) {
                var textItems = textContent.items;
                var finalString = "";

                // Concatenate the string of the item to the final string
                for (var i = 0; i < textItems.length; i++) {
                    var item = textItems[i];

                    finalString += item.str + " ";
                }

                // Solve promise with the text retrieven from the page
                resolve(finalString);
            });
        });
    });
}

function pdfAsArray(pdfAsArray) {

    console.log(`pdfAsArray`);

    PDFJS.getDocument(pdfAsArray).then(function (pdf) {
        console.log(`PDFJS.getDocument(pdfAsArray).then(function (pdf) {`);

        var pdfDocument = pdf;
        // Create an array that will contain our promises
        var pagesPromises = [];

        for (var i = 0; i < pdf.pdfInfo.numPages; i++) {
            // Required to prevent that i is always the total of pages
            (function (pageNumber) {
                // Store the promise of getPageText that returns the text of a page
                pagesPromises.push(getPageText(pageNumber, pdfDocument));
            })(i + 1);
        }

        // Execute all the promises
        Promise.all(pagesPromises).then(function (pagesText) {
            console.log(`Promise.all(pagesPromises)`);

            // Display text of all the pages in the console
            // e.g ["Text content page 1", "Text content page 2", "Text content page 3" ... ]
            console.log(pagesText); // representing every single page of PDF Document by array indexing
            console.log(pagesText.length);
            var outputStr = "";
            let str = "";
            for (var pageNum = 0; pageNum < pagesText.length; pageNum++) {
                // console.log(pagesText[pageNum]);
                outputStr = "";
                outputStr = "<br/><br/>Page " + (pageNum + 1) + " contents <br/> <br/>";




                str += pagesText[pageNum];
                // var div = document.getElementById('output');
                // div.innerHTML += (outputStr + pagesText[pageNum]);

            }

            addTransactionsToFileNames(str);





        });

    }, function (reason) {
        console.log('workingggg', reason)
        // PDF loading error
        console.error(reason);
    });
}


// MY CODE

let fileNameData = {};

let allData = [];


let fromDateElem = document.getElementById('fromDate');
fromDateElem.addEventListener('change', updateDate);
let toDateElem = document.getElementById('toDate');
toDateElem.addEventListener('change', updateDate);

let filter = {
    fromTime: (new Date(fromDateElem.value)).getTime(),
    toTime: (new Date(toDateElem.value)).getTime(),
}

console.log(`filter`, filter);


function updateDate(event) {
    console.log(`event`, event);
    let [year, month, date] = event.target.value.split('-');
    let d = new Date();
    d.setMonth(Number(month) - 1);
    d.setYear(Number(year));
    d.setDate(Number(date));

    if (event.target.id == "fromDate") {
        d.setHours(0, 0, 0, 0);
        filter.fromTime = d.getTime();
    } else {
        d.setHours(23, 59, 59);
        filter.toTime = d.getTime();
    }

    console.log(`dateee`, d);

}







function addTransactionsToFileNames(mainStr) {
    console.log('addTransactionsToFileNames');



    let resStr = "";


    let dailyBalanceSummaryIndex = mainStr.indexOf('DAILY BALANCE SUMMARY');

    while (dailyBalanceSummaryIndex !== -1) {
        let currentIndex = mainStr.indexOf('/', dailyBalanceSummaryIndex + 1);

        let startIndex = currentIndex - 2;


        while ([" ", "/", ".", ","].includes(mainStr[currentIndex]) || !isNaN(mainStr[currentIndex])) {
            currentIndex++;
        }

        resStr += mainStr.slice(startIndex, currentIndex);

        console.log(currentIndex)
        console.log(mainStr.slice(startIndex, currentIndex))


        dailyBalanceSummaryIndex = mainStr.indexOf('DAILY BALANCE SUMMARY', currentIndex);

        console.log(dailyBalanceSummaryIndex)

    }


    let custRefIndex = mainStr.indexOf('Cust Ref');
    let year = mainStr.slice(custRefIndex - 5, custRefIndex - 1);

    let statementPeriodIndex = mainStr.indexOf("Statement Period:");

    let yearsStr = mainStr.slice(statementPeriodIndex, custRefIndex).toLowerCase();
    console.log(`yearsStr`, yearsStr);
    let doesContainTwoYears = yearsStr.includes('jan') && yearsStr.includes('dec');


    // let data = sortDate();
    // console.log(data);
    let data = breakStrByDate(resStr, year, doesContainTwoYears);
    allData.push(...data);

    // fileNameData[fileName] = data;

    // console.log(`fileName`, fileName);
    console.log(`data =>`, data);




    totalFileNamesLen--;

    if (totalFileNamesLen === 0) {
        let minRowDiv = document.getElementById("minRow");
        let outputDiv = document.getElementById("output");

        allData = filterData(allData);

        let sortedData = sortDate(allData);
        console.log(`sortedData =>`, sortedData);
        outputDiv.innerHTML = "";
        outputDiv.appendChild(convertDataForShowing(sortedData));

        let minRow = getLowestAmountRow(sortedData);
        console.log(`minRow =>`, minRow);
        minRowDiv.innerHTML = "";
        minRowDiv.appendChild(convertDataForShowing([minRow].filter(item => item)));




        // debugger;

    }


}

function breakStrByDate(str, year, doesContainTwoYears) {
    console.log(`doesContainTwoYears =>`, doesContainTwoYears);

    let arr = [];
    let slashIndex = str.indexOf("/");

    while (slashIndex !== -1) {

        let firstEmptySpace = str.indexOf(" ", slashIndex + 1);
        let secondEmptySpace = str.indexOf(" ", firstEmptySpace + 1);

        let amount = str.slice(firstEmptySpace + 1, secondEmptySpace)

        let month = `${str[slashIndex - 2]}${str[slashIndex - 1]}`;



        arr.push({
            year: (month == "12" && doesContainTwoYears) ? year - 1 : year,
            month,
            date: `${str[slashIndex + 1]}${str[slashIndex + 2]}`,
            amount,
        })

        slashIndex = str.indexOf("/", slashIndex + 1);
    }

    return arr;
}

function sortDate(arr) {
    console.log(`sortDate`);
    return arr.sort((a, b) => Number(a.year) - Number(b.year) || Number(a.month) - Number(b.month) || Number(a.date) - Number(b.date));
}

function getLowestAmountRow(arr) {
    console.log(`getLowestAmountRow`);
    arr = arr.map(item => ({ ...item, amountInNumber: Number(item.amount.replaceAll(",", "")) }));
    let minAmountInNumber = Math.min(...arr.map(item => item.amountInNumber));
    return arr.find(item => item.amountInNumber === minAmountInNumber);
}

function filterData(arr) {
    console.log(`filterData`);
    return arr.filter(item => {
        let month = Number(item.month);
        let date = Number(item.date);
        let year = Number(item.year);

        let d = new Date();
        d.setMonth(month - 1);
        d.setDate(date);
        d.setYear(year);
        let currentRowTime = d.getTime();

        if (currentRowTime >= filter.fromTime && currentRowTime <= filter.toTime) {
            return true;
        } else {
            return false;
        }
    })
}

function convertDataForShowing(arr) {
    let mainDiv = document.createElement('div');

    if (arr.length > 0) {
        arr.forEach(({ year, month, date, amount }) => {
            let liElem = document.createElement('li');
            liElem.innerHTML = `${month}/${date}/${year} -- ${amount}`;
            mainDiv.appendChild(liElem);
        });
    }

    return mainDiv;
}