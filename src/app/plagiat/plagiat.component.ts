import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild} from '@angular/core';
import JSZip from "jszip";
import {HighlightAutoResult, HighlightJS} from "ngx-highlightjs";
import {Subscription} from "rxjs";
import {diffChars, Change} from 'diff';


@Component({
    selector: 'app-plagiat',
    templateUrl: './plagiat.component.html',
    styleUrls: ['./plagiat.component.css']
})
export class PlagiatComponent implements OnInit, AfterViewInit, OnDestroy {
    codeFile: File | null = null;
    selectedFiles: File[] = [];
    @ViewChild('rangeInput') rangeInput!: ElementRef;
    @ViewChild('rangeOutput') rangeOutput!: ElementRef;

    rangePercent: string | number = -1;

    highlightedCode1: any;
    highlightedCode2: any;
    highlightSubscription: Subscription | undefined;
    similarCode: any[] = [];
    response!: HighlightAutoResult;
    language: string = '';
    isSelectedLanguage: string = '';
    indexExpanded: boolean = false;

    isShowHelpColor: boolean = true;

    constructor(private highlightService: HighlightJS,
                private renderer: Renderer2) {
    }

    ngOnInit(): void {
        if (this.rangeInput) {
            this.rangePercent = this.rangeInput.nativeElement.value;
        }
        this.updateSlider();
    }

    ngAfterViewInit(): void {
        this.renderer.listen(this.rangeInput.nativeElement, 'change', () => {
            this.rangePercent = this.rangeInput.nativeElement.value;
            this.updateSlider();
        });

        this.renderer.listen(this.rangeInput.nativeElement, 'input', () => {
            this.rangePercent = this.rangeInput.nativeElement.value;
            this.updateSlider();
        });
    }

    updateSlider(): void {
        if (this.rangeOutput) {
            this.rangeOutput.nativeElement.innerHTML = `${this.rangePercent}%<span></span>`;
        }
        const hueRotate = `-${this.rangePercent}deg`;
        if (this.rangeInput) {
            this.renderer.setStyle(this.rangeInput.nativeElement, 'filter', `hue-rotate(${hueRotate})`);
            this.renderer.setStyle(this.rangeOutput.nativeElement, 'transform', `translateX(-50%) scale(${1 + (parseInt(this.rangePercent as string) / 100)})`);
            this.renderer.setStyle(this.rangeOutput.nativeElement, 'left', `${this.rangePercent}%`);
        }
    }

    onCodeFileSelected(event: any) {
        const input = event.target as HTMLInputElement;
        const allowedExtensions = ['.ts', '.php'];
        if (input.files && input.files[0]) {
            const fileExtension = input.files[0].name.substring(input.files[0].name.lastIndexOf('.')).toLowerCase();
            this.isSelectedLanguage = fileExtension;
            if (allowedExtensions.includes(fileExtension)) {
                this.codeFile = input.files && input.files[0];
            } else {
                alert('Неприпустиме розширення файлу.');
                location.reload();
            }
        }
    }

    onFileSelectedArchive(event: any) {
        const allowedExtensions = ['.zip'];
        if (event.target.files && event.target.files[0]) {
            const fileExtension = event.target.files[0].name.substring(event.target.files[0].name.lastIndexOf('.')).toLowerCase();
            if (allowedExtensions.includes(fileExtension)) {
                this.selectedFiles = Array.from(event.target.files);
            } else {
                alert('Неприпустиме розширення файлу.');
                location.reload();
            }
        }
    }

    readCodeFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                const code = event.target.result as string;
                resolve(code);
            };
            reader.onerror = () => {
                reject('Помилка при читанні фрагменту коду.');
            };
            reader.readAsText(file);
        });
    }

    readArchiveFile(file: File): Promise<{ name: string; content: string }[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                const data = event.target.result as ArrayBuffer;
                const zip = new JSZip();
                zip.loadAsync(data).then((zip) => {
                    const filePromises: Promise<{ name: string; content: string }>[] = [];

                    zip.forEach((relativePath, zipEntry) => {
                        if (!zipEntry.dir) {
                            const filePromise = zipEntry.async('text').then((fileData) => {
                                const decodedContent = this.decodeContent(fileData);
                                return {
                                    name: zipEntry.name,
                                    content: decodedContent,
                                };
                            });
                            filePromises.push(filePromise);
                        }
                    });

                    Promise.all(filePromises)
                        .then((files) => {
                            const filteredFiles = files.filter((file) => {
                                const undesiredString = /Mac OS X/;
                                return !file.content.match(undesiredString);
                            });
                            resolve(filteredFiles);
                        })
                        .catch(() => {
                            reject('Помилка при читанні файлів з архіву.');
                        });
                }).catch(() => {
                    reject('Помилка при читанні архіву файлів.');
                });
            };
            reader.onerror = (event: any) => {
                reject('Помилка при читанні архіву файлів.');
            };
            reader.readAsArrayBuffer(file);
        });
    }

    decodeContent(content: string): string {
        const lineBreakMarker = '%E2%86%B5';
        const indentMarker = '%E2%80%A6';

        const lineBreak = '\n';
        const indent = '  ';

        let decodedContent = decodeURIComponent(content);

        decodedContent = decodedContent.replace(new RegExp(lineBreakMarker, 'g'), lineBreak);
        decodedContent = decodedContent.replace(new RegExp(indentMarker, 'g'), indent);

        return decodedContent;
    }

    checkPlagiarism() {
        if (!this.isSelectedLanguage.includes(this.language)) {
            alert(`Ви вибрали ${this.language}, a завантажили ${this.isSelectedLanguage} мову програмування.Будь ласка виберіть і завантажне однакову мову програмування!!!`);
            location.reload();
            return;
        }
        if (this.codeFile && this.selectedFiles.length > 0) {
            this.readCodeFile(this.codeFile)
                .then(code => {
                    this.readArchiveFile(this.selectedFiles[0])
                        .then((fileContents) => {
                            for (const fileContent of fileContents) {
                                this.highlightPlagiarism(code, fileContent.content);
                                const highlightedCode = this.highlightCodeDifference(code, fileContent.content);
                                const maxLength = Math.max(code.length, fileContent.content.length);
                                const distance = this.levenshteinDistance(code, fileContent.content);
                                const plagiarismPercentage = ((maxLength - distance) / maxLength) * 100;
                                this.similarCode.push({
                                    name: fileContent.name,
                                    content1: code,
                                    content2: fileContent.content,
                                    percent: plagiarismPercentage,
                                    code1: this.highlightedCode1,
                                    code2: this.highlightedCode2,
                                    diff: highlightedCode,
                                    result: distance > Math.floor(maxLength * (this.rangePercent as number / 100)) ? 'Вітаю!!! Ваша програма пройшла перевірку на плагіат' : 'Ваша програма не пройшла перевірку на плагіат((('
                                })
                                ;
                            }
                        })
                })
                .catch((error) => {
                    console.error(error);
                });
            this.similarCode.forEach((_item) => {
                _item.isExpanded = this.indexExpanded;
            })
        }
    }

    levenshteinDistance(str1: string, str2: string): number {
        const m = str1.length;
        const n = str2.length;

        // Ініціалізуємо матрицю розміром (m+1) x (n+1)
        const dp: number[][] = [];
        for (let i = 0; i <= m; i++) {
            dp[i] = [];
            dp[i][0] = i;
        }
        for (let j = 0; j <= n; j++) {
            dp[0][j] = j;
        }

        // Заповнюємо матрицю
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1, // Видалення
                        dp[i][j - 1] + 1, // Вставка
                        dp[i - 1][j - 1] + 1 // Заміна
                    );
                }
            }
        }
        return dp[m][n];
    }

    highlightPlagiarism(code1: string, code2: string): void {
        this.highlightSubscription = this.highlightService
            .highlightAuto(code1, [this.language])
            .subscribe((result: HighlightAutoResult) => {
                this.highlightedCode1 = result.secondBest.value.replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/\?&gt;/g, '>').replace(/&quot;/g, '"');
            });
        this.highlightSubscription = this.highlightService
            .highlightAuto(code2, [this.language])
            .subscribe((result: HighlightAutoResult) => {
                this.highlightedCode2 = result.secondBest.value.replace(/&#x27;/g, "'")
                    .replace(/&lt;/g, '<').replace(/\?&gt;/g, '>').replace(/&quot;/g, '"');
            })

    }

    highlightCodeDifference(oldCode: string, newCode: string): string {
        const diff = diffChars(newCode, oldCode);
        let highlightedCode = '';

        diff.forEach((change: Change) => {
            let value = change.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

            if (change.added) {
                highlightedCode += `<span style="background:rgba(238,36,0);font-weight:bold">${value}</span>`;
            } else if (change.removed) {
                highlightedCode += `<span style="background:rgba(174,238,1);font-weight:bold">${value}</span>`;
            } else {
                highlightedCode += value;
            }
        });

        return highlightedCode;
    }


    onHighlight(e: HighlightAutoResult) {
        this.response = {
            language: e.language,
            relevance: e.relevance,
            secondBest: '{...}',
            value: '{...}',
        };
    }

    ngOnDestroy(): void {
        if (this.highlightSubscription) {
            this.highlightSubscription.unsubscribe();
        }
    }

    public toggleMenu(event: Event) {
        const target = event.target as HTMLElement;
        target.classList.toggle('active');
    }

}
