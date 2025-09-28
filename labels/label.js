function setup() {
  
  async function make_pdf(yarns){
    //PDFLib init https://pdf-lib.js.org
    var PDFDocument = await PDFLib.PDFDocument.create();
    PDFDocument.registerFontkit(fontkit);
    const Font = await PDFDocument.embedFont(PDFLib.StandardFonts.Helvetica);
    const FontBold = await PDFDocument.embedFont(PDFLib.StandardFonts.HelveticaBold);
    
    //All fields of a PDF live within the Form abstraction. A PDF should have at most one Form.
    form = PDFDocument.getForm();
    
    //There are four labels on a landscape Letter size page
    //Everytime four labels have been made, a new page is created
    //PDFs coordinates are Units-72 Units to the inch
    //The coordinate origin is the lower left-hand corner of a page
    var labels_made = 0;
    var page;
    for (var i = 0; i < yarns.length; i++){
      if (labels_made % 4 == 0) {
        page = PDFDocument.addPage([792.0, 612.0]); //Landscape 11x8.5
      }
      
      //Move x/y offset based on which of 4 label positions is required
      var x_pt = i % 2 == 0 ? 40 : 420;
      var y_pt = i % 4 > 1 ? 24 : 330;
      page.drawRectangle({x: x_pt,
                          y: y_pt,
                          width: 348,
                          height: 258,
                          color: PDFLib.grayscale(1), //Black
                          borderWidth: 1});
      labels_made++;

      //Creating an object of fields for arrow expression utilization
      //A PDF Field exists within the PDF's Form which is why we call a Form method
      var label_fields = {"manufacturer":form.createTextField("manufacturer."+i),
                          "product":form.createTextField("product."+i),
                          "fiber":form.createTextField("fiber."+i),
                          "yardage":form.createTextField("yardage."+i),
                          "price":form.createTextField("price."+i)};

      //A border of 1 is default, need to explicitly say 0
      label_fields.manufacturer.addToPage(page, {x:x_pt+6, y:y_pt+210, width: 336, height: 42, borderWidth: 0});
      label_fields.product.addToPage(page, {x:x_pt+6, y:y_pt+150, width: 336, height: 66, borderWidth: 0});
      label_fields.fiber.addToPage(page, {x:x_pt+6, y:y_pt+84, width: 336, height: 66, borderWidth: 0});
      label_fields.yardage.addToPage(page, {x:x_pt+6, y:y_pt+48, width: 336, height: 36, borderWidth: 0});
      label_fields.price.addToPage(page, {x:x_pt+6, y:y_pt+6, width: 336, height: 36, borderWidth: 0});

      Object.keys(label_fields).forEach((k) => label_fields[k].setAlignment(PDFLib.TextAlignment.Center));
      Object.keys(label_fields).forEach((k) => label_fields[k].enableMultiline());
      Object.keys(label_fields).forEach((k) => label_fields[k].setFontSize(24));

      //Fiber content and price need additional processing
      var fiber_content = "";
      yarns[i].fibers.forEach((f) => fiber_content = fiber_content.concat(" / ",f.fiber_pct,"% ",f.fiber));
      fiber_content = fiber_content.substring(3); //Remove leading " / "

      var price = "";
      Object.keys(yarns[i].prices).forEach((k) => (Object.keys(yarns[i].prices).length == 1)
                                                   //Only one price, don't use key
                                                   ? price = price.concat(" / $",yarns[i].prices[k])
                                                   //Multiple prices, use key and value
                                                   : price = price.concat(" / ",k," $",yarns[i].prices[k]));
      price = price.substring(3); //Remove leading " / "

      label_fields.manufacturer.setText(yarns[i].manufacturer);
      label_fields.product.setText(yarns[i].product);
      label_fields.fiber.setText(fiber_content);
      label_fields.yardage.setText(yarns[i].yardage+" yards");
      label_fields.price.setText(price);

      //updateAppearances() needs to be the last operation
      const bold_fields = ["product", "price"];
      Object.keys(label_fields).forEach((k) => (bold_fields.includes(k)) 
                                              ? label_fields[k].updateAppearances(FontBold)
                                              : label_fields[k].updateAppearances(Font));

    }

    //This is what applies all the styling that has been set above
    form.flatten();

    //Saving pdf via <a> tag that is clicked
    const pdfBytes = await PDFDocument.save()
    var blob = new Blob([pdfBytes], {type: "application/pdf"});
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = "labels.pdf";
    link.click();
  }

  //The upload <input> is hidden in the HTML, so it needs to be clicked programatically
  document.getElementById('upload_button').addEventListener('click', function(){
    document.getElementById('csv_file_input').click();
  });

  document.getElementById('csv_file_input').addEventListener('change', function(){
    var input = this.files[0];
    var yarns = [];
    var reader = new FileReader();

    reader.onload = function(event) {
      var records = this.result.split(/\r\n|\n/); //Both depending on OS

      for (var i = 0; i < records.length; i++) {
        records[i] = records[i].replace(/,+$/, ""); //Remove trailing commas
        if (records[i].length < 2) {                //Remove empty row
          continue;
        }
        
        fields = records[i].split(','); //Not considering commas in fields
        yarns[i] = {"manufacturer":fields[0].trim(),
                    "product":fields[1].trim(),
                    "fibers":[],
                    "prices":{}};

        var offset = 0; //Used since the length of each record is unknown
        var total_fiber_content = 0;
        while (total_fiber_content < 100) {
          yarns[i].fibers.push({"fiber":fields[2+offset].trim(),
                                "fiber_pct":parseFloat(fields[3+offset].trim())});
          total_fiber_content += yarns[i].fibers.at(-1).fiber_pct;
          offset += 2;
        }
        yarns[i].yardage = fields[2+offset];

        //Convert meters to yards if appropriate
        if (yarns[i].yardage.includes('m')) {
          yarns[i].yardage = String(Math.round(parseInt(yarns[i].yardage.slice(0,-1)) * 1.09361));
        }

        //?? operator used to pass a "default" if no style is given
        while (fields.length > 3+offset) {
          yarns[i].prices[fields[4+offset] ?? "default"] = parseFloat(fields[3+offset]).toFixed(2);
          offset += 2;
        } 
      }
      make_pdf(yarns);
    };
    reader.readAsText(input, 'ISO-8859-1');
  });
}
