const express = require('express');
const JSZip = require('jszip');

const app = express();
const port = process.env.PORT || 3000;


function hexToHsvEntry(hex) {
    // Convert HEX to RGB first
    function hexToRgb(hex) {
        let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.toLowerCase().replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : null;
    }

    // Convert RGB to HSV
    function rgbToHsv(r, g, b) {
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;

        let d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return {
            h: h,
            s: s,
            v: v
        };
    }

    // Convert HEX to RGB and then to HSV
    const rgb = hexToRgb(hex);
    if (!rgb) {
        throw new Error("Invalid HEX value " + hex);
    }
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

    // Create the color entry JSON structure
    return {
        "alpha": 1,
        "origin": 1,
        "colorSpace": 0,
        "colorModel": 0,
        "brightness": hsv.v,
        "components": [hsv.h, hsv.s, hsv.v],
        "version": "5.0",
        "colorProfile": "KzqhZFd5qeY0dE+vmwHpECsMm4j9bezteTTfhrlJr34=",
        "saturation": hsv.s,
        "hue": hsv.h
    };
}

async function zip(content) {
    const zip = new JSZip();
    zip.file("Swatches.json", content);
    return zip.generateAsync({ type: "uint8array" });
}

app.use('/', express.static('app', {
    index: "swatches.html"
}));
// API endpoint to process HEX and generate swatches via GET
app.get('/generate-swatches', async (req, res) => {
    try {
        const hexValues = req.query.colors;
        const name = req.query.name || "Pallete " + (Math.floor(Math.random() * 90000) + 10000);

        if (!hexValues) {
            return res.status(400).send('No HEX values provided');
        }

        const hsvColors = hexValues.split(/[\n\r]+/)
            .flatMap(line => {
                const hexArray = line.split(/[\s,]+/); // Split by spaces or commas
                let colors = hexArray.map(hex => hex.trim()).filter(hex => hex).map(hex => hexToHsvEntry(hex));
                if (colors.length < 10) {
                    const len = 10 - colors.length;
                    colors = [...colors, ...Array(len).fill(null)]
                }
                return colors;
            });

        console.log("colors = " + JSON.stringify(hsvColors, null, 2));

        if (hsvColors.length === 0) {
            return res.status(400).send('No valid HEX values provided.');
        }

        const swatchesJson = {
            "name": name,
            "swatches": hsvColors,
            "colorProfiles": [
                {
                    "colorSpace": 0,
                    "hash": "KzqhZFd5qeY0dE+vmwHpECsMm4j9bezteTTfhrlJr34=",
                    "iccData": "AAAMSExpbm8CEAAAbW50clJHQiBYWVogB84AAgAJAAYAMQAAYWNzcE1TRlQAAAAASUVDIHNSR0IA\r\nAAAAAAAAAAAAAAAAAPbWAAEAAAAA0y1IUCAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\r\nAAAAAAAAAAAAAAAAAAAAAAARY3BydAAAAVAAAAAzZGVzYwAAAYQAAABsd3RwdAAAAfAAAAAUYmtw\r\ndAAAAgQAAAAUclhZWgAAAhgAAAAUZ1hZWgAAAiwAAAAUYlhZWgAAAkAAAAAUZG1uZAAAAlQAAABw\r\nZG1kZAAAAsQAAACIdnVlZAAAA0wAAACGdmlldwAAA9QAAAAkbHVtaQAAA\/gAAAAUbWVhcwAABAwA\r\nAAAkdGVjaAAABDAAAAAMclRSQwAABDwAAAgMZ1RSQwAABDwAAAgMYlRSQwAABDwAAAgMdGV4dAAA\r\nAABDb3B5cmlnaHQgKGMpIDE5OTggSGV3bGV0dC1QYWNrYXJkIENvbXBhbnkAAGRlc2MAAAAAAAAA\r\nEnNSR0IgSUVDNjE5NjYtMi4xAAAAAAAAAAAAAAASc1JHQiBJRUM2MTk2Ni0yLjEAAAAAAAAAAAAA\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAADzUQABAAAA\r\nARbMWFlaIAAAAAAAAAAAAAAAAAAAAABYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAA\r\nt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9kZXNjAAAAAAAAABZJRUMgaHR0cDovL3d3dy5pZWMu\r\nY2gAAAAAAAAAAAAAABZJRUMgaHR0cDovL3d3dy5pZWMuY2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZGVzYwAAAAAAAAAuSUVDIDYxOTY2LTIuMSBEZWZhdWx0\r\nIFJHQiBjb2xvdXIgc3BhY2UgLSBzUkdCAAAAAAAAAAAAAAAuSUVDIDYxOTY2LTIuMSBEZWZhdWx0\r\nIFJHQiBjb2xvdXIgc3BhY2UgLSBzUkdCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGRlc2MAAAAAAAAA\r\nLFJlZmVyZW5jZSBWaWV3aW5nIENvbmRpdGlvbiBpbiBJRUM2MTk2Ni0yLjEAAAAAAAAAAAAAACxS\r\nZWZlcmVuY2UgVmlld2luZyBDb25kaXRpb24gaW4gSUVDNjE5NjYtMi4xAAAAAAAAAAAAAAAAAAAA\r\nAAAAAAAAAAAAAAB2aWV3AAAAAAATpP4AFF8uABDPFAAD7cwABBMLAANcngAAAAFYWVogAAAAAABM\r\nCVYAUAAAAFcf521lYXMAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAKPAAAAAnNpZyAAAAAAQ1JU\r\nIGN1cnYAAAAAAAAEAAAAAAUACgAPABQAGQAeACMAKAAtADIANwA7AEAARQBKAE8AVABZAF4AYwBo\r\nAG0AcgB3AHwAgQCGAIsAkACVAJoAnwCkAKkArgCyALcAvADBAMYAywDQANUA2wDgAOUA6wDwAPYA\r\n+wEBAQcBDQETARkBHwElASsBMgE4AT4BRQFMAVIBWQFgAWcBbgF1AXwBgwGLAZIBmgGhAakBsQG5\r\nAcEByQHRAdkB4QHpAfIB+gIDAgwCFAIdAiYCLwI4AkECSwJUAl0CZwJxAnoChAKOApgCogKsArYC\r\nwQLLAtUC4ALrAvUDAAMLAxYDIQMtAzgDQwNPA1oDZgNyA34DigOWA6IDrgO6A8cD0wPgA+wD+QQG\r\nBBMEIAQtBDsESARVBGMEcQR+BIwEmgSoBLYExATTBOEE8AT+BQ0FHAUrBToFSQVYBWcFdwWGBZYF\r\npgW1BcUF1QXlBfYGBgYWBicGNwZIBlkGagZ7BowGnQavBsAG0QbjBvUHBwcZBysHPQdPB2EHdAeG\r\nB5kHrAe\/B9IH5Qf4CAsIHwgyCEYIWghuCIIIlgiqCL4I0gjnCPsJEAklCToJTwlkCXkJjwmkCboJ\r\nzwnlCfsKEQonCj0KVApqCoEKmAquCsUK3ArzCwsLIgs5C1ELaQuAC5gLsAvIC+EL+QwSDCoMQwxc\r\nDHUMjgynDMAM2QzzDQ0NJg1ADVoNdA2ODakNww3eDfgOEw4uDkkOZA5\/DpsOtg7SDu4PCQ8lD0EP\r\nXg96D5YPsw\/PD+wQCRAmEEMQYRB+EJsQuRDXEPURExExEU8RbRGMEaoRyRHoEgcSJhJFEmQShBKj\r\nEsMS4xMDEyMTQxNjE4MTpBPFE+UUBhQnFEkUahSLFK0UzhTwFRIVNBVWFXgVmxW9FeAWAxYmFkkW\r\nbBaPFrIW1hb6Fx0XQRdlF4kXrhfSF\/cYGxhAGGUYihivGNUY+hkgGUUZaxmRGbcZ3RoEGioaURp3\r\nGp4axRrsGxQbOxtjG4obshvaHAIcKhxSHHscoxzMHPUdHh1HHXAdmR3DHeweFh5AHmoelB6+Hukf\r\nEx8+H2kflB+\/H+ogFSBBIGwgmCDEIPAhHCFIIXUhoSHOIfsiJyJVIoIiryLdIwojOCNmI5QjwiPw\r\nJB8kTSR8JKsk2iUJJTglaCWXJccl9yYnJlcmhya3JugnGCdJJ3onqyfcKA0oPyhxKKIo1CkGKTgp\r\naymdKdAqAio1KmgqmyrPKwIrNitpK50r0SwFLDksbiyiLNctDC1BLXYtqy3hLhYuTC6CLrcu7i8k\r\nL1ovkS\/HL\/4wNTBsMKQw2zESMUoxgjG6MfIyKjJjMpsy1DMNM0YzfzO4M\/E0KzRlNJ402DUTNU01\r\nhzXCNf02NzZyNq426TckN2A3nDfXOBQ4UDiMOMg5BTlCOX85vDn5OjY6dDqyOu87LTtrO6o76Dwn\r\nPGU8pDzjPSI9YT2hPeA+ID5gPqA+4D8hP2E\/oj\/iQCNAZECmQOdBKUFqQaxB7kIwQnJCtUL3QzpD\r\nfUPARANER0SKRM5FEkVVRZpF3kYiRmdGq0bwRzVHe0fASAVIS0iRSNdJHUljSalJ8Eo3Sn1KxEsM\r\nS1NLmkviTCpMcky6TQJNSk2TTdxOJU5uTrdPAE9JT5NP3VAnUHFQu1EGUVBRm1HmUjFSfFLHUxNT\r\nX1OqU\/ZUQlSPVNtVKFV1VcJWD1ZcVqlW91dEV5JX4FgvWH1Yy1kaWWlZuFoHWlZaplr1W0VblVvl\r\nXDVchlzWXSddeF3JXhpebF69Xw9fYV+zYAVgV2CqYPxhT2GiYfViSWKcYvBjQ2OXY+tkQGSUZOll\r\nPWWSZedmPWaSZuhnPWeTZ+loP2iWaOxpQ2maafFqSGqfavdrT2una\/9sV2yvbQhtYG25bhJua27E\r\nbx5veG\/RcCtwhnDgcTpxlXHwcktypnMBc11zuHQUdHB0zHUodYV14XY+dpt2+HdWd7N4EXhueMx5\r\nKnmJeed6RnqlewR7Y3vCfCF8gXzhfUF9oX4BfmJ+wn8jf4R\/5YBHgKiBCoFrgc2CMIKSgvSDV4O6\r\nhB2EgITjhUeFq4YOhnKG14c7h5+IBIhpiM6JM4mZif6KZIrKizCLlov8jGOMyo0xjZiN\/45mjs6P\r\nNo+ekAaQbpDWkT+RqJIRknqS45NNk7aUIJSKlPSVX5XJljSWn5cKl3WX4JhMmLiZJJmQmfyaaJrV\r\nm0Kbr5wcnImc951kndKeQJ6unx2fi5\/6oGmg2KFHobaiJqKWowajdqPmpFakx6U4pammGqaLpv2n\r\nbqfgqFKoxKk3qamqHKqPqwKrdavprFys0K1ErbiuLa6hrxavi7AAsHWw6rFgsdayS7LCszizrrQl\r\ntJy1E7WKtgG2ebbwt2i34LhZuNG5SrnCuju6tbsuu6e8IbybvRW9j74KvoS+\/796v\/XAcMDswWfB\r\n48JfwtvDWMPUxFHEzsVLxcjGRsbDx0HHv8g9yLzJOsm5yjjKt8s2y7bMNcy1zTXNtc42zrbPN8+4\r\n0DnQutE80b7SP9LB00TTxtRJ1MvVTtXR1lXW2Ndc1+DYZNjo2WzZ8dp22vvbgNwF3IrdEN2W3hze\r\not8p36\/gNuC94UThzOJT4tvjY+Pr5HPk\/OWE5g3mlucf56noMui86Ubp0Opb6uXrcOv77IbtEe2c\r\n7ijutO9A78zwWPDl8XLx\/\/KM8xnzp\/Q09ML1UPXe9m32+\/eK+Bn4qPk4+cf6V\/rn+3f8B\/yY\/Sn9\r\nuv5L\/tz\/bf\/\/",
                    "iccName": "sRGB IEC61966-2.1"
                }
            ]
        }
        const swatchFileContent = await zip(JSON.stringify(swatchesJson));
        const buffer = Buffer.from(swatchFileContent);
        res.set({
            'Content-Disposition': 'attachment; filename="swatches.swatches"',
            'Content-Type': 'application/octet-stream',
            'Content-Length': buffer.length

        });
        res.send(buffer);
    } catch (error) {
        res.status(500).send('Error creating swatches file: ' + error.message);
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
