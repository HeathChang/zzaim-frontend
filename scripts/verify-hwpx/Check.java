import kr.dogfoot.hwpxlib.reader.HWPXReader;
import kr.dogfoot.hwpxlib.object.HWPXFile;

public class Check {
    public static void main(String[] args) throws Exception {
        HWPXFile f = HWPXReader.fromFilepath(args[0]);
        System.out.println("READ OK");
        System.out.println("sections=" + f.sectionXMLFileList().count());
        var sec = f.sectionXMLFileList().get(0);
        System.out.println("paragraphs=" + sec.countOfPara());
        int pageBreaks = 0, colBreaks = 0;
        for (int i = 0; i < sec.countOfPara(); i++) {
            var p = sec.getPara(i);
            if (Boolean.TRUE.equals(p.pageBreak())) pageBreaks++;
            if (Boolean.TRUE.equals(p.columnBreak())) colBreaks++;
        }
        System.out.println("pageBreaks=" + pageBreaks + " columnBreaks=" + colBreaks);
        var sp = sec.getPara(0).getRun(0).secPr();
        System.out.println("pageW=" + sp.pagePr().width() + " pageH=" + sp.pagePr().height());
    }
}
