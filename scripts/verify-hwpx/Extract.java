import kr.dogfoot.hwpxlib.reader.HWPXReader;
import kr.dogfoot.hwpxlib.object.HWPXFile;
import kr.dogfoot.hwpxlib.tool.textextractor.TextExtractMethod;
import kr.dogfoot.hwpxlib.tool.textextractor.TextExtractor;

public class Extract {
    public static void main(String[] args) throws Exception {
        HWPXFile f = HWPXReader.fromFilepath(args[0]);
        String text = TextExtractor.extract(f, TextExtractMethod.InsertControlTextBetweenParagraphText, true, null);
        System.out.println("--- TEXT (first 700) ---");
        System.out.println(text.substring(0, Math.min(700, text.length())));
        System.out.println("--- len=" + text.length());
    }
}
