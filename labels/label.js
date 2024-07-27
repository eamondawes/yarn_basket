function setup() {
  
  async function make_pdf(yarns){
    var PDFDocument = await PDFLib.PDFDocument.create();
    PDFDocument.registerFontkit(fontkit)
    const Font = await PDFDocument.embedFont(PDFLib.StandardFonts.Helvetica)
    const FontBold = await PDFDocument.embedFont(PDFLib.StandardFonts.HelveticaBold)
    form = PDFDocument.getForm();
    
    var labels_made = 0;
    var page;
    for (var i = 0; i < yarns.length; i++){
      if (labels_made % 4 == 0) {
        page = PDFDocument.addPage([792.0, 612.0]);
      }
      var x_pt = i % 2 == 0 ? 24 : 420;
      var y_pt = i % 4 > 1 ? 24 : 330;
      page.drawRectangle({x: x_pt,
                          y: y_pt,
                          width: 348,
                          height: 258,
                          color: PDFLib.grayscale(1),
                          borderWidth: 1});
      labels_made++;
      
      manufacturerField = form.createTextField("manufacturer."+i)
      productField = form.createTextField("product."+i)
      fiberField = form.createTextField("fiber."+i)
      yardageField = form.createTextField("yardage."+i)
      priceField = form.createTextField("price."+i)
      
      manufacturerField.addToPage(page, {x:x_pt+6, y:y_pt+210, width: 336, height: 42, borderWidth: 0})
      productField.addToPage(page, {x:x_pt+6, y:y_pt+154, width: 336, height: 66, borderWidth: 0})
      fiberField.addToPage(page, {x:x_pt+6, y:y_pt+84, width: 336, height: 66, borderWidth: 0})
      yardageField.addToPage(page, {x:x_pt+6, y:y_pt+48, width: 336, height: 36, borderWidth: 0})
      priceField.addToPage(page, {x:x_pt+6, y:y_pt+6, width: 336, height: 36, borderWidth: 0})
      
      manufacturerField.setAlignment(PDFLib.TextAlignment.Center)
      productField.setAlignment(PDFLib.TextAlignment.Center)
      fiberField.setAlignment(PDFLib.TextAlignment.Center)
      yardageField.setAlignment(PDFLib.TextAlignment.Center)
      priceField.setAlignment(PDFLib.TextAlignment.Center)
      
      manufacturerField.enableMultiline()
      productField.enableMultiline()
      fiberField.enableMultiline()
      yardageField.enableMultiline()
      priceField.enableMultiline()
      
      var fiber_content = "";
      yarns[i].fibers.forEach((f) => fiber_content = fiber_content.concat(" / ",f.fiber_pct,"% ",f.fiber));
      fiber_content = fiber_content.substring(3);
      
      var price = ""
      if (Object.keys(yarns[i].prices).length > 1){
        Object.keys(yarns[i].prices).forEach((k) => price = price.concat(" / ",k," $",yarns[i].prices[k]));
        price = price.substring(19);
      } else {
        price = "$"+yarns[i].prices.default
      }
      
      manufacturerField.setText(yarns[i].manufacturer);
      productField.setText(yarns[i].product);
      fiberField.setText(fiber_content);
      yardageField.setText(yarns[i].yardage+" yards");
      priceField.setText(price);

      manufacturerField.setFontSize(24)
      productField.setFontSize(24)
      fiberField.setFontSize(24)
      yardageField.setFontSize(24)
      priceField.setFontSize(24)

      manufacturerField.updateAppearances(Font);
      productField.updateAppearances(FontBold);
      fiberField.updateAppearances(Font);
      yardageField.updateAppearances(Font);
      priceField.updateAppearances(FontBold);
    }

    form.flatten();
    
    const pdfBytes = await PDFDocument.save()
    
    var blob = new Blob([pdfBytes], {type: "application/pdf"});
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = "labels.pdf";
    link.click();
  }
  
  document.getElementById('upload_button').addEventListener('click', function(){
    document.getElementById('csv_file_input').click();
  });
  
  document.getElementById('csv_file_input').addEventListener('change', function(){
    var input = this.files[0];
    var yarns = []
    var reader = new FileReader();
    reader.onload = function(event) {
      var records = this.result.split(/\r\n|\n/);
      for (var i = 0; i < records.length; i++) {
        fields = records[i].split(',')
        yarns[i] = {"manufacturer":fields[0].trim(),
                    "product":fields[1].trim(),
                    "fibers":[{"fiber":fields[2].trim(), "fiber_pct":fields[3].trim()}],
                    "prices":{"default":"0.00"}}
        
        var total_fiber_content = yarns[i].fibers[0].fiber_pct;
        var offset = 2
        while (total_fiber_content < 100) {
          yarns[i].fibers.push({"fiber":fields[2+offset].trim(), 
                                "fiber_pct":parseInt(fields[3+offset].trim())})
          total_fiber_content += fields[3+offset].trim();
          offset += 2
        }
        yarns[i].yardage = fields[2+offset];
        
        if (yarns[i].yardage.includes('m')) {
          yarns[i].yardage = String(Math.round(parseInt(yarns[i].yardage.substring(0,yarns[i].yardage.length)) * 1.09361))
        }
        
        yarns[i].prices.default = fields[3+offset];
        
        while (fields.length > 4+offset) {
          yarns[i].prices[fields[4+offset]] = fields[3+offset];
          offset += 2;
        }
      }
      make_pdf(yarns)
    };
    reader.readAsText(input);
  });
}