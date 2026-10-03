import { checkCorrect } from './answers'
export function correctIndexFor(options, question) {
  return options.findIndex((_,index) => checkCorrect(options,index,question?.correct_answer))
}
